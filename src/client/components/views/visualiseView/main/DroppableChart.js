import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Stack, MenuItem, Snackbar, FilledInput } from '@mui/material';
import { useDrop } from 'react-dnd';
import { useDispatch, useStore } from 'react-redux';
import { FormControl, InputLabel, Select, Typography } from '@mui/material';
import { string, node } from 'prop-types';
import { updateWidget } from '@metacell/geppetto-meta-client/common/layout/actions';
import vars from '../../../../assets/styles/variables';
import LineChart from './charts/lineChart';
import { makeStyles } from '@mui/styles';
import CandleStickChart from './charts/CandleStick';
import ScatterChart from './charts/ScatterChart';
import { filters, renderChartIcon } from './charts/filter';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { getInitialChartData, randomArray, randomString } from './charts/util';

const { elementBorderColor, dropdownBorderColor } = vars;

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiSelect-filled': {
      paddingTop: 'none !important',
      background: 'white',
      '& .MuiFilledInput-root': {
        background: 'white',
      },
    },
    '& .MuiTypography-root': {
      fontWeight: 500,
    },
    '& .MuiInputBase-root': {
      borderRadius: theme.spacing(1),
      '& .css-1gzkxga-MuiSelect-select-MuiInputBase-input-MuiFilledInput-input':
        {
          borderRadius: theme.spacing(1),
          boxShadow:
            ' 0px 3px 8px rgba(0, 0, 0, 0.12), 0px 3px 1px rgba(0, 0, 0, 0.04)',
          paddingTop: '0.375rem',
          paddingBottom: '0.375rem',
          paddingLeft: '0.5rem',
        },
    },
    '& .MuiInputBase-root:hover': {
      content: 'none',
    },
    '& .MuiInputBase-root:before, & .MuiInputBase-root:after': {
      borderBottom: 'none',
      content: 'none',
    },
  },
  filter: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
}));

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      padding: 0,
      borderRadius: '0.75rem',
    },
  },
};

const chartInfo = { mode: 'markers', type: 'scatter' };

export const DroppableChart = ({ id, model, accept = 'element' }) => {
  const dispatch = useDispatch();
  const store = useStore();
  const classes = useStyles();
  const [chartType, setChartType] = useState(() => 'line');
  const chartRef = useRef();

  const getWidgetById = useCallback(
    (id) => {
      return store.getState().widgets[id];
    },
    [store]
  );

  const watchModel = useMemo(() => model, [model]);

  const chartData = useMemo(
    () => getInitialChartData(watchModel),
    [watchModel]
  );
  const scatterData = useMemo(
    () => getInitialChartData(watchModel, chartInfo),
    [watchModel]
  );

  const chart = useMemo(() => {
    switch (chartType) {
      case 'line':
        return <LineChart data={chartData} />;
      case 'candle-stick':
        return <CandleStickChart data={chartData} />;
      case 'scatter':
        return <ScatterChart data={scatterData} />;
      default:
        return null;
    }
  }, [chartData, chartType, scatterData]);

  const onChartFilterChange = useCallback((event) => {
    const selected = event.target.value;
    setChartType(selected);
  }, []);

  const checkCanDrop = useCallback((item) => {
    return !chartRef.current.model?.some((ele) => ele.id === item.id);
  }, []);

  const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
    accept,
    canDrop: checkCanDrop,
    drop: (node) => onDrop(node, canDrop),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  const onDrop = useCallback(
    async (node) => {
      if (!node) return;

      const newModel = [...chartRef.current.model];

      const widgetConfig = getWidgetById(id);
      const isDroppable = await checkCanDrop(node);

      if (isDroppable) {
        const newNode = {
          ...node,
          // random chart data
          // TODO : remove when connect to endpoint
          x: randomArray(5, 40),
          y: randomArray(5, 40),
          text: Array(10)
            .fill('*')
            .map((_) => randomString(4)),
        };

        dispatch(
          updateWidget({
            ...widgetConfig,
            props: {
              ...widgetConfig.props,
              model: [...newModel, newNode],
            },
          })
        );
      }
    },
    [getWidgetById, id, checkCanDrop, dispatch]
  );

  useEffect(() => {
    chartRef.current = {
      model,
    };
  }, [model]);
  console.log(watchModel, model, canDrop, 'watchModel');

  const isActive = isOver && canDrop;
  const inActive = isOver && !canDrop;
  let backgroundColor = elementBorderColor;
  if (isActive) {
    backgroundColor = 'rgba(118, 118, 128, 0.1)';
  } else if (canDrop) {
    backgroundColor = dropdownBorderColor;
  }

  return (
    <Box
      ref={dropRef}
      style={{ backgroundColor, height: '100%', position: 'relative' }}
    >
      {chart}
      <Box className={classes.filter}>
        <FilterSelect
          size="small"
          value={chartType}
          onChange={onChartFilterChange}
          renderValue={(value) => (
            <Stack direction="row" spacing={0.75} alignItems="center">
              {renderChartIcon(value)}
              <Typography fontSize={14} textTransform="">
                {value.charAt(0).toUpperCase() +
                  value.slice(1).replace('-', ' ')}
              </Typography>
            </Stack>
          )}
        >
          {!!filters && filters.length > 0
            ? filters.map((filter) => (
                <MenuItem key={filter.value} value={filter.value}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <>{renderChartIcon(filter.value)}</>
                    <Typography fontSize={14} textTransform="">
                      {filter.label}
                    </Typography>
                  </Stack>
                </MenuItem>
              ))
            : 'No chart types found'}
        </FilterSelect>
      </Box>
      {inActive && (
        <Snackbar
          autoHideDuration={6000}
          open={inActive}
          message="Model already exist in chart"
        />
      )}
    </Box>
  );
};

const FilterSelect = ({ labelId, id, label, children, ...props }) => {
  const classes = useStyles();

  return (
    <FormControl classes={{ root: classes.root }} variant="filled" fullWidth>
      <InputLabel id={labelId} classes={classes.label}>
        {label}
      </InputLabel>
      <Select
        size="small"
        label={label}
        labelId={labelId}
        input={<FilledInput classes={{ root: classes.root }} />}
        IconComponent={(props) => (
          <ExpandMoreRoundedIcon {...props} fontSize="inherit" />
        )}
        MenuProps={MenuProps}
        {...props}
      >
        {children}
      </Select>
    </FormControl>
  );
};

FilterSelect.propTypes = {
  id: string,
  labelId: string,
  label: string,
  children: node,
};