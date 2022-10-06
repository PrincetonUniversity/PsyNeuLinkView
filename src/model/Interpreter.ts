import { PNLClasses } from '../constants';
import { MetaLink, MetaNode, PortTypes } from '@metacell/meta-diagram';
import ProjectionLink from './links/ProjectionLink';
import QueryService from '../services/queryService';
import MechanismNode from './nodes/mechanism/MechanismNode';
import CompositionNode from './nodes/composition/CompositionNode';

export default class ModelInterpreter {
    nativeModel: any;
    jsonModel: Object;
    modelMap: { [key: string]: Map<String, CompositionNode|MechanismNode|ProjectionLink|any> };
    pnlModel: { [key: string]: Array<CompositionNode|MechanismNode|ProjectionLink|any> };
    metaModel: { [key: string]: Array<MetaNode|MetaLink> };
    nodeIdsMap: Map<any, any>;
    linkIdsMap: Map<any, any>;

    constructor(model: any) {
        this.modelMap = {
            'nodes': new Map(),
            'links': new Map()
        };
        this.pnlModel = {
            [PNLClasses.COMPOSITION]: [],
            [PNLClasses.MECHANISM]: [],
            [PNLClasses.PROJECTION]: [],
        };
        this.metaModel = {
            [PNLClasses.COMPOSITION]: [],
            [PNLClasses.MECHANISM]: [],
            [PNLClasses.PROJECTION]: [],
        };
        this.nodeIdsMap = new Map();
        this.linkIdsMap = new Map();
        this.nativeModel = model;
        this.jsonModel = this._convertModel(model);
    }

    _convertModel(model: any) : Object {
        model[PNLClasses.COMPOSITION].forEach((singleModel: any) => {
            this.nodeIdsMap = new Map();
            this.linkIdsMap = new Map();
            this.castComposition(singleModel, undefined, this.modelMap);
        });
        model[PNLClasses.MECHANISM].forEach((singleNode: any) => {
            this.castMechanism(singleNode, undefined, this.modelMap);
        });
        this.setMetaModel()
        return this.pnlModel;
    }

    updateModel(newModel: any) {
        this.jsonModel = this._convertModel(newModel);
    }

    getModel() {
        return this.jsonModel;
    }

    setMetaModel() {
        this.metaModel[PNLClasses.COMPOSITION] = this.pnlModel[PNLClasses.COMPOSITION].map(
            (item:CompositionNode) => item.getMetaNode()
        );
        this.metaModel[PNLClasses.MECHANISM] = this.pnlModel[PNLClasses.MECHANISM].map(
            (item:MechanismNode) => item.getMetaNode()
        );
        this.metaModel[PNLClasses.PROJECTION] = this.pnlModel[PNLClasses.PROJECTION].map(
            (item:ProjectionLink) => item.getMetaLink()
        );
    }

    getMetaModel() {
        return this.metaModel;
    }

    getNativeModel() {
        return this.nativeModel;
    }

    getModelElementsMap() {
        return this.modelMap;
    }

    parseNodePorts(name: string, type: string): { [key: string]: any } {
        let ports: { [key: string]: any[] } = {
            [PortTypes.INPUT_PORT]: [],
            [PortTypes.OUTPUT_PORT]: [],
            [PortTypes.PARAMETER_PORT]: []
        };

        const result = QueryService.getPorts(name, type);

        if (result !== '') {
            const parsedPorts = result.replace('[', '').replace(']', '').split(', ');
            parsedPorts.forEach(element => {
                const elementData = element.slice(1, -1).split(' ');
                switch(elementData[0]) {
                    case 'InputPort':
                        ports[PortTypes.INPUT_PORT].push(elementData[1]);
                        break;
                    case 'OutputPort':
                        ports[PortTypes.OUTPUT_PORT].push(elementData[1]);
                        break;
                    case 'ParameterPort':
                        ports[PortTypes.PARAMETER_PORT].push(elementData[1]);
                        break;
                }
            });
        }
        return ports;
    }

    castComposition(
        item: MechanismNode|CompositionNode|ProjectionLink|any,
        parent: any|undefined,
        modelMap: { [key: string]: Map<String, CompositionNode|MechanismNode|ProjectionLink|any> })
        : MechanismNode|CompositionNode|ProjectionLink {
        let newNode = item;
        let extra: { [key: string]: any } = {};
        let ports : any = [];
        let boundingBox = {
            llx: 0,
            lly: 0,
            urx: 0,
            ury: 0,
        };
        if (item?.bb) {
            let _vertices = item.bb.split(',');
            boundingBox.llx = _vertices[0];
            boundingBox.lly = _vertices[1];
            boundingBox.urx = _vertices[2];
            boundingBox.ury = _vertices[3];
        }
        newNode = new CompositionNode(item?.name, parent, '', false, ports, extra, undefined, boundingBox);
        modelMap['nodes'].set(newNode.getName(), newNode);
        // temp array to host all the nested compositions
        let childrenCompositions: Array<any> = [];

        // we iterate the objects and first identify all the mechanisms
        item.objects.forEach((child: any) => {
            let newChild = undefined;
            if (child.rankdir) {
                // we park for now nested compositions
                childrenCompositions.push(child)
            } else {
                newChild = this.castMechanism(child, newNode, this.modelMap);
                newNode.addChild(newChild);
            }
            if (newChild && !this.nodeIdsMap.has(child?._gvid)) {
                this.nodeIdsMap.set(child?._gvid, newChild);
            }
        });

        // Now da we have all the mechanisms in the idsMap we continue with the compositions
        childrenCompositions.forEach((child: any) => {
            let newChild = undefined;
            newChild = this.nestedComposition(child, newNode, this.modelMap);
            newNode.addChild(newChild);

            if (newChild && !this.nodeIdsMap.has(child?._gvid)) {
                this.nodeIdsMap.set(child?._gvid, newChild);
            }
        });

        item.edges.forEach((edge: any) => {
            let tail = this.nodeIdsMap.get(edge.tail);
            let head = this.nodeIdsMap.get(edge.head);
            // TODO: adjust the cast method below with tail and head
            let newChild = this.castEdge(edge, tail, head, newNode, this.modelMap);
            if (newChild && !this.linkIdsMap.has(edge?._gvid)) {
                this.linkIdsMap.set(edge?._gvid, newChild);
            }
            newNode.addChild(newChild);
        });

        this.pnlModel[PNLClasses.COMPOSITION].push(newNode);
        return newNode;
    }

    nestedComposition(
        item: MechanismNode|CompositionNode|ProjectionLink|any,
        parent: CompositionNode,
        modelMap: { [key: string]: Map<String, CompositionNode|MechanismNode|ProjectionLink|any> })
        : MechanismNode|CompositionNode|ProjectionLink {
        let newNode = item;
        let extra: { [key: string]: any } = {};
        let ports : any = [];
        let boundingBox = {
            llx: 0,
            lly: 0,
            urx: 0,
            ury: 0,
        };
        if (item?.bb) {
            let _vertices = item.bb.split(',');
            boundingBox.llx = _vertices[0];
            boundingBox.lly = _vertices[1];
            boundingBox.urx = _vertices[2];
            boundingBox.ury = _vertices[3];
        }
        newNode = new CompositionNode(item?.name, parent, '', false, ports, extra, undefined, boundingBox);
        modelMap['nodes'].set(newNode.getName(), newNode);

        // Iterates nodes of the nested composition to fill the children map/array
        item.nodes.forEach((id: any) => {
            let child = this.nodeIdsMap.get(id);
            child.setParent(newNode);
        });

        item.edges.forEach((id: any) => {
            // TODO: we should change the paternity of the link but not really needed now.
        });

        this.pnlModel[PNLClasses.COMPOSITION].push(newNode);
        return newNode;
    }

    castMechanism(
        item: MechanismNode|CompositionNode|ProjectionLink|any,
        parent: CompositionNode|undefined,
        modelMap: { [key: string]: Map<String, CompositionNode|MechanismNode|ProjectionLink|any> })
        : MechanismNode|CompositionNode|ProjectionLink {
            let newNode = item;
            let ports: { [key: string]: any } = this.parseNodePorts(item?.name, PNLClasses.MECHANISM);
            let extra: { [key: string]: any } = {};
            let coordinates = item.pos.split(',');
            newNode = new MechanismNode(
                item?.name,
                parent,
                '',
                false,
                ports,
                extra,
                coordinates[0],
                coordinates[1],
            );
            modelMap['nodes'].set(newNode.getName(), newNode);
            this.pnlModel[PNLClasses.MECHANISM].push(newNode);
            return newNode;
    }

    castEdge(
        item: MechanismNode|CompositionNode|ProjectionLink|any,
        sender: MechanismNode|CompositionNode,
        receiver: MechanismNode|CompositionNode,
        parent: CompositionNode|undefined,
        modelMap: { [key: string]: Map<String, CompositionNode|MechanismNode|ProjectionLink|any> })
        : MechanismNode|CompositionNode|ProjectionLink {
            let newNode = item;
            let name = '';
            let extra: { [key: string]: any } = {};
            let senderPortName, receiverPortName;
            // senderPortName = this.getPortName(item.tailport);
            // receiverPortName = this.getPortName(item.headport);
            senderPortName = item.tailport;
            receiverPortName = item.headport;
            newNode = new ProjectionLink(
                name,
                sender?.getName(),
                senderPortName,
                receiver.getName(),
                receiverPortName,
                false,
                extra
            );
            modelMap['links'].set(newNode.getName(), newNode);
            this.pnlModel[PNLClasses.PROJECTION].push(newNode);
            return newNode;
    }

    getPortName(portString: string): string {
        const [portType, ...portName] = portString.split('-');
        return portName.join('-');
    }
}
