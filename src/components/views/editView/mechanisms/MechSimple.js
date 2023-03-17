import * as React from "react";
import NodeSelection from "./NodeSelection";
import { Box, Typography } from "@mui/material";
import { PortWidget, PortTypes } from "@metacell/meta-diagram";
import {clipPathBorderSize} from "../../../../constants";
import {getClipPath} from "../../../../services/clippingService";

class MechSimple extends React.Component {
  render() {
    const { model, model: { options }, engine, changeVisibility } = this.props;

    const parentElement = document.querySelector(`[data-nodeid=${model.getGraphPath()[0]}]`);
    const nodeElement = document.querySelector(`[data-nodeid=${model.getID()}]`);

    const clipPath = getClipPath(parentElement, nodeElement, clipPathBorderSize, engine.model.getZoomLevel() / 100)

    const styles = clipPath !== null ? { clipPath: clipPath } : {};

    return (
      <Box className={`primary-node ${options?.variant}`} sx={{...styles}}>
        {options.selected && (
          <NodeSelection node={model} engine={engine} text={"Show properties"} changeVisibility={changeVisibility} />
        )}
        <Box
          className="primary-node_header"
        >
          <Box className="icon" />
          <Typography component="p">
            {options.name}
          </Typography>
          { options.ports.map(port => {
            switch (port.getType()) {
              case PortTypes.INPUT_PORT:
                return (
                  <PortWidget key={model.getID() + '_' + port.getId()} engine={engine} port={model.getPort(port.getId())} className="simple-input-port">
                    <div className="simple-input-port" />
                  </PortWidget>
                );
              case PortTypes.OUTPUT_PORT:
                return (
                  <PortWidget key={model.getID() + '_' + port.getId()} engine={engine} port={model.getPort(port.getId())} className="simple-output-port">
                    <div className="simple-output-port" />
                  </PortWidget>
                );
              default:
                // TODO: what to do with other ports?
                return (<></>);
            }
          })}
        </Box>
      </Box>
    );
  }
}

export default MechSimple;
