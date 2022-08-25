import * as React from "react";
import NodeSelection from "./NodeSelection";
import { Box, Typography } from "@mui/material";
import { PortWidget, PortTypes } from "@metacell/meta-diagram";

class MechSimple extends React.Component {
  render() {
    const { model, model: { options }, engine, changeVisibility } = this.props;

    return (
      <Box className={`primary-node ${options?.variant}`}>
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
                  <PortWidget key={model.getID() + '_' + port.getId()} engine={engine} port={model.getPort(port.getId())} test='input-dario'>
                    <div className="simple-input-port" />
                  </PortWidget>
                );
              case PortTypes.OUTPUT_PORT:
                return (
                  <PortWidget key={model.getID() + '_' + port.getId()} engine={engine} port={model.getPort(port.getId())} test='output-dario'>
                    <div className="simple-output-port" />
                  </PortWidget>
                );
              default:
                console.log('different port found' + port.getName() + ' ' + port.getType());
            }
          })}
        </Box>
      </Box>
    );
  }
}

export default MechSimple;
