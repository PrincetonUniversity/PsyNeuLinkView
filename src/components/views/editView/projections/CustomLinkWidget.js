import * as React from "react";
import { DefaultLinkWidget } from '@projectstorm/react-diagrams';
import { projectionLinkArrow, projectionLink } from "../../../../assets/styles/variables";

const pointlength = 6;

const CustomLinkArrowWidget = (props) => {
	const { point, previousPoint } = props;

	const angle =
		90 +
		(Math.atan2(
			point.getPosition().y - previousPoint.getPosition().y,
			(point.getPosition().x - 10) - (previousPoint.getPosition().x + 10)
		) *
			180) /
			Math.PI;

	return (
		<g className="arrow" transform={'translate(' + point.getPosition().x + ', ' + point.getPosition().y + ')'}>
			<g style={{ transform: 'rotate(' + angle + 'deg)' }}>
				<g transform={'translate(0, -3)'}>
					<polyline
						points={`${pointlength * -2},${pointlength * 4} 0,${pointlength + 2} ${pointlength * 2},${pointlength * 4}`}
						{
                            ...projectionLinkArrow
                        }
						data-id={point.getID()}
						data-linkid={point.getLink().getID()}
					/>
				</g>
			</g>
		</g>
	);
};


class CustomLink extends React.Component {
    constructor(props) {
        super(props);

        this.path = React.createRef();
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    shouldComponentUpdate() {
        return true;
    }

    render() {
        return (
            <g>
                <path
                    ref={this.path}
                    {
                        ...projectionLink
                    }
                    d={this.props.path}
				/>
            </g>
        );
    }
}


export class CustomLinkWidget extends DefaultLinkWidget {
	generateArrow(point, previousPoint) {
		return (
			<CustomLinkArrowWidget
				key={point.getID()}
				point={point}
				previousPoint={previousPoint}
				colorSelected={this.props.link.getOptions().selectedColor}
				color={this.props.link.getOptions().color}
			/>
		);
	}

    generateLinePath(firstPoint, lastPoint) {
        // the below shorten the touching point as per design, computing a point of the segment minus the arrow height
        if (firstPoint.x <= lastPoint.x) {
            let x = lastPoint.x - firstPoint.x;
            let y = lastPoint.y - firstPoint.y;
            let distance = Math.sqrt(x * x + y * y);
            let newDistance = distance - (pointlength * 3);
            const angle = (Math.atan2( lastPoint.y - firstPoint.y, (lastPoint.x) - (firstPoint.x)) * 180) / Math.PI;
            let newX = Math.round(Math.cos(angle * Math.PI / 180) * newDistance + firstPoint.x);
            let newY = Math.round(Math.sin(angle * Math.PI / 180) * newDistance + firstPoint.y);
            return `M${firstPoint.x + 10},${firstPoint.y} L ${newX},${newY}`;
        } else {
            let x = firstPoint.x - lastPoint.x;
            let y = firstPoint.y - lastPoint.y;
            let distance = Math.sqrt(x * x + y * y);
            let newDistance = distance - (pointlength * 3);
            const angle = (Math.atan2( lastPoint.y - firstPoint.y, (lastPoint.x) - (firstPoint.x)) * 180) / Math.PI;
            let newX = Math.round(Math.cos(angle * Math.PI / 180) * newDistance + firstPoint.x);
            let newY = Math.round(Math.sin(angle * Math.PI / 180) * newDistance + firstPoint.y);
            return `M${firstPoint.x - 10},${firstPoint.y} L ${newX},${newY}`;
        }
    }

	render() {
		//ensure id is present for all points on the path
		var points = this.props.link.getPoints();
		var paths = [];
		this.refPaths = [];

		//draw the multiple anchors and complex line instead
		for (let j = 0; j < points.length - 1; j++) {
			paths.push(
				<CustomLink
                    key={`link-from-${points[j].getID()}-to-${points[j+1].getID()}`}
                    path={this.generateLinePath(
                        {x: points[j].getX(), y: points[j].getY()},
                        {x: points[j + 1].getX(), y: points[j + 1].getY()}
                    )}
                    {...this.props}
                />
			);
		}

		if (this.props.link.getTargetPort() !== null) {
			paths.push(this.generateArrow(points[points.length - 1], points[points.length - 2]));
		} else {
			paths.push(this.generatePoint(points[points.length - 1]));
		}

		return <g data-default-link-test={this.props.link.getOptions().testName}>{paths}</g>;
	}
}


class CustomLinkAdapter extends React.Component {
    render() {
        const {model, engine} = this.props;
        return (
            <CustomLinkWidget link={model} diagramEngine={engine}/>
        );
    }
}

// @ts-ignore
export default CustomLinkAdapter;