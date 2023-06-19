import * as React from "react";
import NodeSelection from "./NodeSelection";
import { Box, Typography } from "@mui/material";
import { PortWidget, PortTypes, CallbackTypes } from "@metacell/meta-diagram";
import { getClipPath } from "../../../../../services/clippingService";
import ModelSingleton from "../../../../../model/ModelSingleton";
import { PNLMechanisms } from "../../../../../../constants";
import {
  ControlMechIcon,
  MechIcon,
  ComparatorMechIcon,
  CompositionIcon,
  DDMIcon,
  EpisodicMechIcon,
  GatingMechIcon,
  IntegratorMechIcon,
  KohonenMechIcon,
  KWTAMechIcon,
  LCAMechIcon,
  ObjMechIcon,
  RecurrentTransferMechIcon,
  TransferMechIcon
} from "./Icons";

class MechSimple extends React.Component {
  constructor(props) {
    super(props);
    this.listeners = {};
    this.prevParentID = null;
    this.state = {
      isMounted: false,
    };

    this.clipPath = undefined;
    this.elementRef = React.createRef();
    this.getIconFromType = this.getIconFromType.bind(this);
    this.updateParentStyle = this.updateParentStyle.bind(this);
    this.unregisterListener = this.unregisterListener.bind(this);
    this.registerParentListener = this.registerParentListener.bind(this);
  }

  componentDidMount() {
    this.registerParentListener();
    this.setState({ isMounted: true });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const listenerId = this.getListenerID(this.props.model);
    if (prevState.isMounted !== this.state.isMounted && this.state.isMounted) {
      this.forceUpdate();
    }
    if (this.prevParentID !== listenerId) {
      this.unregisterListener(this.prevParentID);
      this.registerParentListener();
      this.prevParentID = listenerId;
    }
    this.updateParentStyle();
  }

  componentWillUnmount() {
    Object.keys(this.listeners).forEach((key) => {
      this.unregisterListener(key);
    });
  }

  registerParentListener() {
    const { model } = this.props;
    const parentNode = ModelSingleton.getInstance()
      .getMetaGraph()
      .getParent(model);
    if (parentNode) {
      const listenerId = this.getListenerID(model);
      this.listeners[listenerId] = parentNode.registerListener({
        [CallbackTypes.NODE_RESIZED]: (_) => {
          this.forceUpdate();
        },
      });
      this.prevParentID = listenerId;
    }
  }

  getMechClipPath(parentNode) {
    const { model } = this.props;
    return parentNode ? getClipPath(parentNode, model) : null;
  }

  getListenerID(node) {
    return node.getGraphPath().toString();
  }

  unregisterListener(id) {
    if (Object.keys(this.listeners).includes(id)) {
      this.listeners[id].deregister();
      delete this.listeners[id];
    }
  }

  updateParentStyle() {
    const parentElement = this.elementRef.current.parentElement;
    if (this.clipPath) {
      parentElement.style.clipPath = this.clipPath;
    } else {
      parentElement.style.clipPath = "";
    }
  }

  getIconFromType() {
    const { model } = this.props;
    switch (model.getOption('shape')) {
      case PNLMechanisms.MECHANISM:
      case PNLMechanisms.LEARNING_MECH:
      case PNLMechanisms.MODULATORY_MECH:
      case PNLMechanisms.PROCESSING_MECH:
      case PNLMechanisms.CONTRASTIVE_MECH:
      case PNLMechanisms.AUTO_LEARNING_MECH:
      case PNLMechanisms.PREDICTION_ERROR_MECH:
      case PNLMechanisms.DEFAULT_PROCESSING_MECH:
        return <MechIcon />;
      case PNLMechanisms.GATING_MECH:
        return <GatingMechIcon />;
      case PNLMechanisms.CTRL_MECH:
      case PNLMechanisms.LC_CTRL_MECH:
      case PNLMechanisms.AGT_CTRL_MECH:
      case PNLMechanisms.OPT_CTRL_MECH:
        return <ControlMechIcon />;
      case PNLMechanisms.COMPOSITION_MECH:
        return <CompositionIcon />;
      case PNLMechanisms.INTEGRATOR_MECH:
        return <IntegratorMechIcon />;
      case PNLMechanisms.OBJ_MECH:
        return <ObjMechIcon />;
      case PNLMechanisms.TRANSFER_MECH:
        return <TransferMechIcon />;
      case PNLMechanisms.RECURRENT_TRANSFER_MECH:
        return <RecurrentTransferMechIcon />;
      case PNLMechanisms.DDM:
        return <DDMIcon />;
      case PNLMechanisms.EPISODIC_MECH:
        return <EpisodicMechIcon />;
      case PNLMechanisms.COMPARATOR_MECH:
        return <ComparatorMechIcon />;
      case PNLMechanisms.KOHONEN_MECH:
      case PNLMechanisms.KOHONEN_LEARNING_MECH:
        return <KohonenMechIcon />;
      case PNLMechanisms.KWTA_MECH:
        return <KWTAMechIcon />;
      case PNLMechanisms.LCA_MECH:
        return <LCAMechIcon />;
      default:
        return <MechIcon />;
    }
  }

  render() {
    const {
      model,
      model: { options },
      engine,
      changeVisibility,
    } = this.props;
    const parentNode = ModelSingleton.getInstance()
      .getMetaGraph()
      .getParent(model);
    this.clipPath = this.getMechClipPath(parentNode);

    return (
      <Box
        ref={this.elementRef}
        className={`primary-node ${options?.variant}`}
        sx={{
          boxShadow: this.clipPath ? "none !important" : undefined,
        }}
      >
        {options.selected && (
          <NodeSelection
            node={model}
            engine={engine}
            text={"Show properties"}
            changeVisibility={changeVisibility}
          />
        )}
        <Box className="primary-node_header">
          <Box className="icon-wrapper">
            {this.getIconFromType()}
          </Box>{' '}
          <Typography component="p">{options.name}</Typography>
          {options.ports.map((port) => {
            switch (port.getType()) {
              case PortTypes.INPUT_PORT:
                return (
                  <PortWidget
                    key={model.getID() + "_" + port.getId()}
                    engine={engine}
                    port={model.getPort(port.getId())}
                    className="simple-input-port"
                  >
                    <div className="simple-input-port" />
                  </PortWidget>
                );
              case PortTypes.OUTPUT_PORT:
                return (
                  <PortWidget
                    key={model.getID() + "_" + port.getId()}
                    engine={engine}
                    port={model.getPort(port.getId())}
                    className="simple-output-port"
                  >
                    <div className="simple-output-port" />
                  </PortWidget>
                );
              default:
                // TODO: what to do with other ports?
                return <></>;
            }
          })}
        </Box>
      </Box>
    );
  }
}

export default MechSimple;