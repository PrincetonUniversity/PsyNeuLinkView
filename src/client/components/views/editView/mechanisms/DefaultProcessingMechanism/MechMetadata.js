import * as React from 'react';
import Box from '@mui/material/Box';
import { withStyles } from '@mui/styles';
import NodeSelection from '../shared/NodeSelection';
import vars from '../../../../../assets/styles/variables';
import { PortTypes } from '@metacell/meta-diagram';
import FunctionInput, {
  CustomValueInput,
  MetaDataInput,
} from '../shared/FunctionInput';
import { MechIcon } from '../shared/Icons';
import debounce from 'lodash.debounce';
import { toObject } from '../../utils';
import PortsList from '../shared/PortsList';

const styles = {
  textColor: {
    color: vars.functionTextColor,
  },
  codeColor: {
    color: vars.functionCodeColor,
  },
};

function MechMetadata(props) {
  const {
    classes,
    model,
    model: { options },
    engine,
    changeVisibility,
    updateOptions,
  } = props;

  const [optionsValue, setOptions] = React.useState(() => options);
  const optionKeys = toObject(Object.entries(options));

  const handleValueChange = ({ key, value }) => {
    setOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // debounce search term
  const debounceFn = React.useCallback(
    debounce((value) => {
      if (updateOptions) {
        updateOptions(value);
      }
    }, 800),
    []
  );

  React.useEffect(() => {
    debounceFn(optionsValue);
  }, [debounceFn, optionsValue]);

  return (
    <Box className={`primary-node rounded ${options.variant}`}>
      {options.selected && (
        <NodeSelection
          node={model}
          engine={engine}
          text={'Hide properties'}
          changeVisibility={changeVisibility}
        />
      )}
      <Box className="primary-node_header">
        <Box className="icon-wrapper">
          <MechIcon />
        </Box>

        <Box display="inline-flex" alignItems="center" component="p">
          <MetaDataInput
            textAlign="center"
            value={optionsValue.name}
            onChange={(e) =>
              handleValueChange({ key: optionKeys.name, value: e.target.value })
            }
          />
        </Box>
      </Box>

      <PortsList
        ports={options.ports}
        portType={PortTypes.INPUT_PORT}
        engine={engine}
        model={model}
      />

      <Box className="seprator" />

      <Box className="block-wrapper">
        <CustomValueInput
          label={optionKeys.default_variable}
          value={optionsValue.default_variable}
          onChange={(e) =>
            handleValueChange({
              key: optionKeys.default_variable,
              value: e.target.value,
            })
          }
        />
        <CustomValueInput
          label={optionKeys.size}
          value={optionsValue.size}
          onChange={(e) =>
            handleValueChange({
              key: optionKeys.size,
              value: e.target.value,
            })
          }
        />
        <CustomValueInput
          label={optionKeys.prefs}
          value={optionsValue.prefs}
          onChange={(e) =>
            handleValueChange({
              key: optionKeys.prefs,
              value: e.target.value,
            })
          }
        />

        <FunctionInput
          label={optionKeys.function}
          value={optionsValue.function}
          onChange={(e) =>
            handleValueChange({
              key: optionKeys.function,
              value: e.target.value,
            })
          }
        />
      </Box>

      <Box className="seprator" />

      <PortsList
        ports={options.ports}
        portType={PortTypes.OUTPUT_PORT}
        engine={engine}
        model={model}
        direction="right"
      />
    </Box>
  );
}

export default withStyles(styles)(MechMetadata);
