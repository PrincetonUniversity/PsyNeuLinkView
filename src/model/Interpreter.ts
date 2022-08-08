// import { castObject } from './utils';
import { PNLTypes } from '../constants';
import ProjectionLink from './links/ProjectionLink';
import MechanismNode from './nodes/mechanism/MechanismNode';
import CompositionNode from './nodes/composition/CompositionNode';

const html2json = require('html2json').html2json
const typesArray = Object.values(PNLTypes);
const parse = require('dotparser');


export default class ModelInterpreter {
    nativeModel: any;
    jsonModel: Object;

    constructor(model: any) {
        this.nativeModel = model;
        this.jsonModel = this._convertModel(model);
    }

    _convertModel(model: any) : Object {
        const parsedModel = {
            'compositions': [],
            'mechanisms': [],
        };

        parsedModel.compositions = model.compositions.map((singleModel: any) => {
            const newModel = parse(singleModel).map((elem: any) => ModelInterpreter.castObject(elem));
            return newModel;
        });

        parsedModel.mechanisms = model.mechanisms.map((singleNode: any) => {
            let tempNode = parse(singleNode)[0].children.filter((elem: { node_id: { id: string; }; }) => elem.node_id.id !== 'graph');
            let newNode = tempNode.map((elem: any) => ModelInterpreter.castObject(elem));
            return newNode;
        });

        return parsedModel;
    }

    updateModel(newModel: any) {
        this.jsonModel = this._convertModel(newModel);
    }

    getModel() {
        return this.jsonModel;
    }

    getNativeModel() {
        return this.nativeModel;
    }

    static castObject(item: MechanismNode|CompositionNode|ProjectionLink|any) : MechanismNode|CompositionNode|ProjectionLink {
        let newNode = item;
        if (item?.type === undefined) {
            throw new TypeError('type is missing, object cannot be casted to the right class type.');
        }
        switch (item.type) {
            case PNLTypes.COMPOSITION: {
                let extra: { [key: string]: any } = {};
                let ports : any = [];
                let children: { [key: string]: any } = {
                    'mechanisms': [],
                    'projections': [],
                    'compositions': [],
                }
                item.children.forEach((element: any) => {
                    if (element.type === 'attr_stmt') {
                        extra[element.target] = {}
                        element.attr_list.forEach( (innerElement: any) => {
                            if (innerElement.type === 'attr') {
                                extra[element.target][innerElement?.id] = innerElement?.eq;
                            }
                        });
                        return;
                    }
                    if (typesArray.includes(element.type)) {
                        switch (element.type) {
                            case PNLTypes.COMPOSITION: {
                                children['compositions'].push(ModelInterpreter.castObject(element));
                                break;
                            }
                            case PNLTypes.MECHANISM: {
                                children['mechanisms'].push(ModelInterpreter.castObject(element));
                                break;
                            }
                            case PNLTypes.PROJECTION: {
                                children['projections'].push(ModelInterpreter.castObject(element));
                                break;
                            }
                            default:
                                // TODO: enable this in the future
                                // throw new Error(`Casting error, "${item.type}" type not known.`);
                                console.log(`Casting error, "${item.type}" type not known.`);
                        }
                    }
                });
                newNode = new CompositionNode(item.id, '', false, ports, extra, children);
                break;
            }
            case PNLTypes.MECHANISM: {
                let ports : any = [];
                let extra: { [key: string]: any } = {};
                item.attr_list.forEach((singleAttr: any) => {
                    if (singleAttr.id === 'label') {
                        // TODO: implement the parsing of the json structure generated below
                        // in order to detect ports and other elements of the node.
                        //
                        // parsedHtml = html2json(singleAttr.eq);
                        return;
                    }
                    if (singleAttr.type === 'attr') {
                        extra[singleAttr?.id] = singleAttr?.eq;
                    }
                });
                newNode = new MechanismNode(item?.node_id?.id, '', false, ports, extra);
                break;
            }
            case PNLTypes.PROJECTION: {
                let name = '';
                let extra: { [key: string]: any } = {};
                let sender, senderPort, receiver, receiverPort;
                item.attr_list.forEach((singleAttr: any) => {
                    if (singleAttr.id === 'label') {
                        name = singleAttr.eq;
                        return;
                    }
                    if (singleAttr.type === 'attr') {
                        extra[singleAttr?.id] = singleAttr?.eq;
                    }
                });
                if (item.edge_list.length === 2) {
                    sender = item.edge_list[0].id;
                    senderPort = item.edge_list[0]['port']['id'];
                    receiver = item.edge_list[1].id;
                    receiverPort = item.edge_list[1]['port']['id'];
                }
                newNode = new ProjectionLink(name, sender, senderPort, receiver, receiverPort, false, extra);
                break;
            }
            default:
                // TODO: enable this in the future
                // throw new Error(`Casting error, "${item.type}" type not known.`);
                console.log(`Casting error, "${item.type}" type not known.`);
        }
        return newNode;
    }
}