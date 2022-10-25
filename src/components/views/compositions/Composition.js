import * as React from "react";
import { Rnd } from "react-rnd";
import { withStyles } from "@mui/styles";
import { Box, Chip } from "@mui/material";
import vars from "../../../assets/styles/variables";
import MORE_OPTION from "../../../assets/svg/option.svg"

const { draggableBg, listItemActiveBg, textWhite, chipTextColor, chipBorderColor } = vars;

const commonStyles = {
  background: `${textWhite} !important`,
  border: `0.0975rem solid ${listItemActiveBg} !important`,
  borderRadius: '0.125rem !important'
};

const styles = () => ({
  root: {
    '& .react-draggable': {
      background: draggableBg,
      border: `0.125rem solid ${chipBorderColor}`,
      borderRadius: '0.75rem',
      display: "flex !important",
      alignItems: "center",
      justifyContent: "center",

      '&:hover': {
        borderColor: listItemActiveBg
      },
    },

    '& .MuiChip-root': {
      background: chipBorderColor,
      borderRadius: '0.75rem',
      padding: '0 0.5rem',
      display: "flex",
      left: 0,
      position: 'absolute',
      color: chipTextColor,
      top: '-1.75rem',
      alignItems: "center",
      height: '1.5rem',
      letterSpacing: '-0.005rem',
      fontWeight: 510,
      fontSize: '0.8125rem',
      lineHeight: '1.25rem',
      flexDirection: 'row-reverse',

      '& .MuiChip-label': {
        padding: 0,
      },

      '& .MuiChip-icon': {
        margin: '0 0 0 0.25rem',
      },
    },
  },

  selected: {
    '&:before': {
      left: 0,
      ...commonStyles
    },

    '&:after': {
      right: 0,
      ...commonStyles
    },

    '& .MuiChip-root': {
      background: listItemActiveBg
    },

    '& .react-draggable': {
      borderColor: listItemActiveBg,
    }
  },
});

class Composition extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false,
      width: props.model.options.width,
      height: props.model.options.height,
    }
    this.changeVisibility = this.changeVisibility.bind(this);
  }

  changeVisibility() {
    this.setState({expanded: !this.state.expanded});
  }

  render() {
    const { expanded } = this.state;
    const { classes } = this.props;

    return (
      <Box className={`${classes.root} ${expanded ? classes.selected : ''}`}>
        <Rnd
          size={{ width: this.state.width, height: this.state.height }}
          position={{ x: this.props.model.options.x, y: this.props.model.options.y }}
          onResizeStop={(e, direction, ref, delta, position) => {
            this.props.model.updateSize(parseFloat(ref.style.width), parseFloat(ref.style.height));
            this.setState({
              width: ref.style.width,
              height: ref.style.height,
              ...position
            });
          }}
        >
          <Chip icon={<img src={MORE_OPTION} alt="" />} label="New Comp" color="secondary" />
        </Rnd>
      </Box>
    );
  }
}

export default withStyles(styles)(Composition);
