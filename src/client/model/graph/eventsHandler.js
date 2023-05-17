import {CallbackTypes} from '@metacell/meta-diagram';
import ModelSingleton from '../ModelSingleton';
import {isDetachedMode} from "../utils";
import {updateCompositionDimensions} from "./utils";


export function handlePostUpdates(event, context) {
    const node = event.entity;
    const modelInstance = ModelSingleton.getInstance();
    switch (event.function) {
        case CallbackTypes.POSITION_CHANGED: {
            const isDetached = isDetachedMode(context);
            if (isDetached) {
                const metaGraph = modelInstance.getMetaGraph()
                const parent = metaGraph.getParent(node)
                if (parent && parent.getID() === context.props.compositionOpened.getID()) {
                    updateCompositionDimensions(context.props.compositionOpened, metaGraph.getChildren(context.props.compositionOpened));
                }
            }
            modelInstance.updateModel(node, context.mousePos.x, context.mousePos.y);
            break;
        }
        case CallbackTypes.SELECTION_CHANGED: {
            const newInstance = node.getID();
            context.props.selectInstance(newInstance);
            break;
        }
        default: {
            console.log(
                'Function callback type not yet implemented ' + event.function
            );
            // return false;
        }
    }
    return true;
}


export function handlePreUpdates(event, context) {
    return true;
}


export const MetaGraphEventTypes = {
    NODE_ADDED: 'NODE_ADDED',
    LINK_ADDED: 'LINK_ADDED',
}