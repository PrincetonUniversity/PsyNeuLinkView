import React from 'react'
import '../css/d3model.css'
import * as d3 from 'd3'
import add_context_menu from '../utility/add_context_menu'
import {Resizable} from 're-resizable'
import {Spinner} from '@blueprintjs/core'
import {Index} from '../utility/d3-helper/d3-helper'
import * as _ from 'lodash'
import {connect} from "react-redux";
import {store} from "../app/redux/store";
import {setStyleSheet, setModelAspectRatio} from "../app/redux/actions";

const context_menu = [
    {
        onClick: {},
        text: 'Placeholder 1'
    },
    {
        onClick: {},
        text: 'Placeholder 2'
    }
];

const style = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

var fs = window.interfaces.filesystem,
    interp = window.interfaces.interpreter,
    rpc_client = window.interfaces.rpc;

class D3model extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            class: `graph-view ${this.props.className}`,
            mounted: false,
            node_width: 20,
            node_height: 15,
            graph: this.props.graph,
            spinner_visible: false
        };
        this.bind_this_to_functions = this.bind_this_to_functions.bind(this);
        this.bind_this_to_functions();
        this.debounce_functions();
        this.set_aspect_ratio();
        this.flags = {
            dirty: false,
            reload_locations: false,
            update_locations: false
        };
    }

    debounce_functions(){
        this.update_script = _.debounce(this.update_script, 100)
        this.set_dirty_flag_to_false = _.debounce(this.set_dirty_flag_to_false, 200)
        this.on_resize = _.debounce(this.on_resize, 100)
    }

    // lifecycle methods

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!(this.props.graph === prevProps.graph)) {
            if (this.props.graph === "loading") {
                d3.selectAll('svg').remove();
                this.setState({"spinner_visible": true})
            } else if (!(this.props.graph === null)) {
                d3.selectAll('svg').remove();
                this.setState({"spinner_visible": false});
                this.stylesheet = null;
                this.setGraph();
            }
        }
        var size_updated = (!_.isEqual(this.props.size, prevProps.size) && this.svg);
        // viewbox must be redimensioned before node positioning is set
        if (size_updated) {
            this.redimension_viewbox();
        }
        if (this.flags.reload_locations) {
            this.set_node_positioning_from_stylesheet();
            this.flags.reload_locations = false;
        }
        if (this.flags.update_locations) {
            this.commit_all_nodes_to_stylesheet();
            this.update_script();
            this.flags.update_locations = false;
        }
        this.update_graph_from_stylesheet(prevProps);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.on_resize);
        window.removeEventListener('wheel', this.on_mouse_wheel);
        window.removeEventListener('keydown', this.on_key_down);
        window.removeEventListener('keyup', this.on_key_up);
        window.removeEventListener('mousemove', this.mouse_move);
        var win = document.querySelector('.graph-view');
        if (win) {
            win.removeEventListener('scroll', this.update_scroll);
        }
        this.setState({mounted: false})
        this.update_script();
        this.efferent_copies = [];
    }

    componentDidMount() {
        window.addEventListener('mousemove', this.mouse_move)
        window.addEventListener('resize', this.on_resize);
        window.addEventListener('wheel', this.on_mouse_wheel, {passive: false});
        window.addEventListener('keydown', this.on_key_down);
        window.addEventListener('keyup', this.on_key_up);
        if (!(this.state.mounted)) {
            if (this.props.graph === "loading") {
                d3.selectAll('svg').remove();
                this.setState({"spinner_visible": true})
            } else if (!(this.props.graph === null)) {
                d3.selectAll('svg').remove();
                this.setState({"spinner_visible": false});
                this.stylesheet = null;
                this.setGraph();
            }
        }
        this.efferent_copies = [];
    }

    mouse_move(e) {
        e.preventDefault();
    }

    set_non_react_state() {
        this.index = new Index();
        this.selected = new Set();
        this.mouse_offset = {x: 0, y: 0};
        this.scaling_factor = 1;
        this.fill_proportion = 1;
    }

    bind_this_to_functions() {
        this.debounce_functions = this.debounce_functions.bind(this);
        this.update_graph_from_stylesheet = this.update_graph_from_stylesheet.bind(this);
        this.redimension_viewbox = this.redimension_viewbox.bind(this);
        this.set_aspect_ratio = this.set_aspect_ratio.bind(this);
        this.commit_all_nodes_to_stylesheet = this.commit_all_nodes_to_stylesheet.bind(this);
        this.validate_stylesheet = this.validate_stylesheet.bind(this);
        this.set_canvas_state_from_stylesheet = this.set_canvas_state_from_stylesheet.bind(this);
        this.set_node_positioning_from_stylesheet = this.set_node_positioning_from_stylesheet.bind(this);
        this.commit_to_stylesheet_and_update_script = this.commit_to_stylesheet_and_update_script.bind(this);
        this.on_resize = this.on_resize.bind(this);
        this.set_non_react_state = this.set_non_react_state.bind(this);
        this.center_graph = this.center_graph.bind(this);
        this.setGraph = this.setGraph.bind(this);
        this.on_key_down = this.on_key_down.bind(this);
        this.on_key_up = this.on_key_up.bind(this);
        this.scale_graph = this.scale_graph.bind(this);
        this.scale_graph_in_place = this.scale_graph_in_place.bind(this);
        this.scale_graph_to_fit = this.scale_graph_to_fit.bind(this);
        this.on_mouse_wheel = this.on_mouse_wheel.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.update_scroll = this.update_scroll.bind(this);
        this.update_script = this.update_script.bind(this);
        this.move_node = this.move_node.bind(this);
        this.on_zoom = this.on_zoom.bind(this);
        this.move_graph = this.move_graph.bind(this);
        this.refresh_edges_for_node = this.refresh_edges_for_node.bind(this);
        this.move_label_to_corresponding_node = this.move_label_to_corresponding_node.bind(this);
        this.handle_style_diff = this.handle_style_diff.bind(this);
        this.handle_dimension_diff = this.handle_dimension_diff.bind(this);
        this.handle_style_diff = this.handle_style_diff.bind(this);
        this.handle_scale_diff = this.handle_scale_diff.bind(this);
        this.handle_zoom_diff = this.handle_zoom_diff.bind(this);
        this.handle_node_diff = this.handle_node_diff.bind(this);
        this.associateVisualInformationWithGraphEdges = this.associateVisualInformationWithGraphEdges.bind(this);
        this.associateVisualInformationWithGraphNodes = this.associateVisualInformationWithGraphNodes.bind(this);
    }

    match_exists_in_efferent_copies(stylesheet) {
        var matching_copy, idx, efferent;
        for (var i = 0; i < this.efferent_copies.length; i++){
            efferent = this.efferent_copies[i]
            if (_.isEqual(stylesheet, efferent)){
                matching_copy = efferent;
                idx = i;
            }
        }
        if (matching_copy){
            this.efferent_copies.splice(idx, 1)
            return true
        }
        else {
            return false
        }
    }

    commit_to_stylesheet_and_update_script(callback = () => {
    }) {
        window.removeEventListener('mouseup', this.commit_to_stylesheet_and_update_script);
        this.redimension_viewbox();
        this.commit_all_nodes_to_stylesheet();
        this.commit_canvas_size_to_stylesheet();
        this.commit_zoom_to_stylesheet();
        this.update_script();
    }

    on_resize() {
        if (![null, 'loading'].includes(this.props.graph)) {
            this.commit_to_stylesheet_and_update_script()
        }
    }

    update_graph_from_stylesheet(prevProps) {
        var style_updated = (!(_.isEqual(this.props.graph_style, prevProps.graph_style))),
            prev_and_current_style_exist = (!_.isEmpty(prevProps.graph_style) && !_.isEmpty(this.props.graph_style));

        if (prev_and_current_style_exist) {
            var style_diff = this.difference(this.props.graph_style, prevProps.graph_style);
            if (!_.isEmpty(style_diff) &&
                !document.hasFocus() &&
                !this.flags.dirty
            ) {
                this.handle_style_diff(style_diff)
            }
        }
    }

    handle_style_diff(style_diff) {
        this.handle_dimension_diff(style_diff);
        this.handle_scale_diff(style_diff);
        this.handle_zoom_diff(style_diff);
        this.handle_scroll_diff(style_diff);
        this.handle_node_diff(style_diff);
    }

    handle_dimension_diff(style_diff) {
        var self = this,
            canvas_ss = self.stylesheet['Canvas Settings']
        if ('Canvas Settings' in style_diff) {
            var canvas_sd = style_diff['Canvas Settings'],
                width_sd = canvas_sd['Width'],
                width_ss = canvas_ss['Width'],
                height_sd = canvas_sd['Height'],
                height_ss = canvas_ss['Height'];
            if ((width_sd && !(width_sd === width_ss))
                || (height_sd && !(height_sd === height_ss))) {
                var width = width_sd ? width_sd : width_ss,
                    height = height_sd ? height_sd : height_ss;
                canvas_ss['Width'] = width;
                canvas_ss['Height'] = height;
                this.props.graph_size_fx(width, height, () => {
                    self.flags.update_locations = true;
                    self.forceUpdate();
                });
            }
        }
    }

    handle_scale_diff(style_diff) {
        if ('Graph Settings' in style_diff) {
            if ('Scale' in style_diff['Graph Settings']) {
                var graph_sd = style_diff['Graph Settings'],
                    graph_ss = this.stylesheet['Graph Settings'],
                    zoom_ss = this.stylesheet['Canvas Settings']['Zoom'] / 100,
                    scale_sd = graph_sd['Scale'];
                if (scale_sd) {
                    var scale_diff = (scale_sd * zoom_ss) / (this.scaling_factor * zoom_ss);
                    this.scale_graph_in_place(scale_diff);
                    graph_ss['Scale'] = scale_sd;
                    this.flags.update_locations = true;
                    this.forceUpdate()
                }
                ;
            }
        }
    }

    handle_zoom_diff(style_diff) {
        var self = this,
            canvas_ss = self.stylesheet['Canvas Settings'];
        if ('Canvas Settings' in style_diff) {
            if ('Zoom' in style_diff['Canvas Settings']) {
                var zoom = style_diff['Canvas Settings']['Zoom'] / 100;
                canvas_ss['Zoom'] = Math.round(zoom * 100);
                this.update_script();
                var xScroll_ss = canvas_ss['xScroll'],
                    yScroll_ss = canvas_ss['yScroll'];
                this.svg.call(this.zoom.scaleTo, zoom);
                var scroll_bounds = this.get_scroll_bounds(),
                    win = document.querySelector('.graph-view');
                win.scrollTo(
                    scroll_bounds.x * (xScroll_ss / 100),
                    scroll_bounds.y * (yScroll_ss / 100)
                )
            }
        }
    }

    handle_scroll_diff(style_diff) {
        var self = this,
            canvas_ss = self.stylesheet['Canvas Settings'],
            scroll_bounds = this.get_scroll_bounds(),
            win = document.querySelector('.graph-view');
        if ('Canvas Settings' in style_diff) {
            if ('xScroll' in style_diff['Canvas Settings']) {
                var xScroll_sd = style_diff['Canvas Settings']['xScroll'];
                canvas_ss['xScroll'] = xScroll_sd;
                win.scrollTo(scroll_bounds.x * (xScroll_sd / 100), win.scrollTop)
            }
            if ('yScroll' in style_diff['Canvas Settings']) {
                var yScroll_sd = style_diff['Canvas Settings']['yScroll'];
                canvas_ss['yScroll'] = yScroll_sd;
                win.scrollTo(win.scrollLeft, scroll_bounds.y * (yScroll_sd / 100))
            }
        }
    }

    handle_node_diff(style_diff) {
        var graph_ss = this.stylesheet['Graph Settings'],
            components_props = this.props.graph_style['Graph Settings']['Components'];
        if ('Graph Settings' in style_diff) {
            if ('Components' in style_diff['Graph Settings']) {
                graph_ss['Components'] = components_props;
                this.set_node_positioning_from_stylesheet();
            }
        }
    }

    difference(object, base) {
        function changes(object, base) {
            return _.transform(object, function (result, value, key) {
                if (!_.isEqual(value, base[key])) {
                    result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
                }
            });
        }

        return changes(object, base);
    }

    validate_stylesheet() {
        if (!(this.stylesheet)) {
            this.stylesheet = _.cloneDeep(this.props.graph_style)
        }
        if (!(this.stylesheet)) {
            this.stylesheet = {}
        }
        if (!('Window Settings' in this.stylesheet)) {
            this.stylesheet['Window Settings'] =
                {
                    Width: '',
                    Height: ''
                }
        }
        if (!('Canvas Settings' in this.stylesheet)) {
            this.stylesheet['Canvas Settings'] = {
                Width: '',
                Height: '',
                Zoom: 100,
                xScroll: 0,
                yScroll: 0
            };
            this.commit_canvas_size_to_stylesheet();
        }

        if (!('Graph Settings' in this.stylesheet)) {
            this.stylesheet['Graph Settings'] = {}
        }

        if (!('Scale' in this.stylesheet['Graph Settings'])) {
            this.stylesheet['Graph Settings']['Scale'] = this.scaling_factor
        }

        if (!('Components' in this.stylesheet['Graph Settings'])) {
            this.stylesheet['Graph Settings']['Components'] = {}
        }
        if (!('Nodes' in this.stylesheet['Graph Settings']['Components'])) {
            this.stylesheet['Graph Settings']['Components']['Nodes'] = {}
        }
    }

    on_key_down(e) {
        if (e.metaKey || e.ctrlKey) {
            if (e.key === '+' || e.key === '=') {
                this.nudge_graph_larger();
            } else if (e.key === '-') {
                this.nudge_graph_smaller();
            }
            if (e.key === 'r') {
                this.reset_graph()
            }
            if (e.key === 'a') {
                this.index.nodes.forEach(
                    (node) => {
                        this.select_node(node)
                    }
                )
            }
        }
        if (e.key.includes('Arrow') && this.selected.size > 0) {
            var increment;
            var self = this;
            e.preventDefault();
            increment = (e.metaKey || e.ctrlKey ? 25 : 1);
            if (e.key === 'ArrowUp') {
                this.move_nodes(0, -increment);
            }
            if (e.key === 'ArrowDown') {
                this.move_nodes(0, increment);
            }
            if (e.key === 'ArrowRight') {
                this.move_nodes(increment, 0);
            }
            if (e.key === 'ArrowLeft') {
                this.move_nodes(-increment, 0);
            }
        }
        if (e.key === 'Escape') {
            this.unselect_all()
        }
    }

    on_key_up(e) {
        // this.update_script();
    }

    on_scroll_end(e) {
        window.removeEventListener('mouseup', this.on_scroll_end)
        this.commit_to_stylesheet_and_update_script();
    }

    update_script(callback = () => {}) {
        var self = this;
        var efferent_copy = {...this.stylesheet}
        this.efferent_copies.push(efferent_copy);
        if (this.props.filepath) {
            store.dispatch(setStyleSheet(efferent_copy));
            rpc_client.update_stylesheet(efferent_copy);
        }
    }

    reset_graph() {
        this.svg.call(this.zoom.transform, d3.zoomIdentity);
    }

    on_mouse_wheel(e) {
        if (e.metaKey || e.ctrlKey) {
            this.mouse_offset = {
                x: e.offsetX,
                y: e.offsetY
            };
            e.preventDefault();
            if (e.deltaY < 0) {
                this.svg.call(this.zoom.scaleBy, 1.02, [e.offsetX, e.offsetY]);
            } else {
                this.svg.call(this.zoom.scaleBy, 0.98, [e.offsetX, e.offsetY]);
            }
        }
    }

    mouse_inside_canvas_bounds(e) {
        var canvas_bounds = this.get_canvas_bounding_box();
        if (
            e.clientX >= canvas_bounds.x && e.clientX <= canvas_bounds.x + canvas_bounds.width &&
            e.clientY >= canvas_bounds.y && e.clientY <= canvas_bounds.y + canvas_bounds.height
        ) {
            return true
        } else {
            return false
        }
    }

    mouse_inside_graph_bounds(e) {
        var graph_bounds = this.get_graph_bounding_box();
        if (
            e.offsetX >= graph_bounds.x && e.offsetX <= graph_bounds.x + graph_bounds.width &&
            e.offsetY >= graph_bounds.y && e.offsetY <= graph_bounds.y + graph_bounds.height
        ) {
            return true
        } else {
            return false
        }
    }

    nudge_graph_larger() {
        this.scale_graph_in_place(1.02);
        this.commit_to_stylesheet_and_update_script();
        this.update_script();
    }

    nudge_graph_smaller() {
        this.scale_graph_in_place(.98);
        this.commit_to_stylesheet_and_update_script();
        this.update_script();
    }

    createSVG() {
        var svg, svg_rect, container;
        svg = d3.select('.graph-view')
            .append('svg')
            .attr('class', 'graph')
            .attr('height', '100%')
            .attr('width', '100%')
            .attr('preserveAspectRatio', 'xMidYMid');
        svg_rect = document.querySelector('svg').getBoundingClientRect();
        svg
            .attr("viewBox", [0, 0, svg_rect.width, svg_rect.height]);
        this.appendDefs(svg);
        this.apply_select_boxes(svg);
        this.apply_zoom(svg);
        this.bind_scroll_updating();
        this.svg = svg;
        container = this.createContainer(svg);
        return container
    }

    createContainer(svg) {
        var container = svg
            .append('g')
            .attr('class', 'container');
        return container
    }

    appendDefs(svg) {
        var colors = ['black', 'orange', 'blue'];
        var svg = svg;
        colors.forEach(
            color => {
                svg.append("svg:defs").append("svg:marker")
                    .attr("id", `triangle_${color}`)
                    .attr("refX", 4)
                    .attr("refY", 4)
                    .attr("markerWidth", 8)
                    .attr("markerHeight", 8)
                    .attr("orient", "auto")
                    .append("path")
                    .attr("d", "M 1 0 8 4 1 8 1 4")
                    .attr("fill", color);
            }
        );
    }

    associateVisualInformationWithGraphNodes() {
        this.props.graph.objects.forEach(function (d) {
                d.x = parseInt(Math.abs(d.text.x));
                d.y = parseInt(Math.abs(d.text.y));
                if ('ellipse' in d) {
                    d.color = d.ellipse.stroke;
                    if ('stroke-width' in d.ellipse) {
                        d.stroke_width = parseInt(d.ellipse['stroke-width'])
                    } else {
                        d.stroke_width = 1
                    }
                } else {
                    d.color = d.polygon.stroke;
                }
                d.name = d.title;
            }
        );
    }

    associateVisualInformationWithGraphEdges() {
        var self = this;
        this.props.graph.edges.forEach(function (d) {
            d.tail_node = self.props.graph.objects[d.tail];
            d.head_node = self.props.graph.objects[d.head];
            d.color = d.path.stroke;
        });
    }

    drawProjections(container) {
        var self = this;
        self.associateVisualInformationWithGraphEdges();
        var id = 0;
        var edge = container.append('g')
            .attr('class', 'edge')
            .selectAll('line')
            .data(self.props.graph.edges)
            .enter()
            .append('line')
            .attr('id', function (d) {
                id += 1;
                return `p${id - 1}`
            })
            .attr('x1', function (d) {
                return d.tail_node.x
            })
            .attr('y1', function (d) {
                return d.tail_node.y
            })
            .attr('x2', function (d) {
                return d.head_node.x
            })
            .attr('y2', function (d) {
                return d.head_node.y
            })
            .attr('stroke-width', 1)
            .attr('stroke', function (d) {
                return d.color
            })
            .attr('marker-end', function (d) {
                var color = d.color;
                var color_map = {
                    '#000000': 'black',
                    '#ffa500': 'orange',
                    '#0000ff': 'blue'
                };
                color = color in color_map ? color_map[color] : color;
                return `url(#triangle_${color})`;
            });
        this.index.add_d3_group(edge, 'projection');
        this.edge = edge;
        this.drawRecurrentProjections(container);
    }

    drawRecurrentProjections(container) {
        var self = this;
        var recurrent_projs = [];
        var id = 0;
        d3.selectAll('g.edge line')
            .each(function (e) {
                if (e.head_node === e.tail_node) {
                    recurrent_projs.push(e);
                }
            });
        var recurrent = container.append('g')
            .attr('class', 'recurrent')
            .selectAll('path')
            .data(recurrent_projs)
            .enter()
            .append('path')
            .attr('id', function (d) {
                id += 1;
                return `r${id - 1}`
            })
            // .attr('d', ()=>{
            //     return self.generate_arc()
            // })
            .attr('fill', 'white')
            .attr('fill-opacity', '0')
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
        self.recurrent = recurrent;
        self.index.add_d3_group(recurrent, 'projection');
    }

    drawNodes(container, nodeDragFunction) {
        var self = this;
        var nodeWidth = self.state.node_width;
        var nodeHeight = self.state.node_height;
        self.associateVisualInformationWithGraphNodes();
        var id = 0;
        var node = container.append('g')
            .attr('class', 'node')
            .selectAll('ellipse')
            .data(this.props.graph.objects)
            .enter()
            .append('ellipse')
            .attr('id', function (d) {
                id += 1;
                return `n${id - 1}`
            })
            .attr('rx', function (d) {
                d.rx = nodeWidth;
                return d.rx
            })
            .attr('ry', function (d) {
                d.ry = nodeHeight;
                return d.ry
            })
            .attr('cx', function (d) {
                return d.x
            })
            .attr('cy', function (d) {
                return d.y
            })
            .attr('fill', 'white')
            .attr('stroke-width', function (d) {
                d.stroke_width = d.stroke_width ? d.stroke_width : 1;
                return d.stroke_width
            })
            .attr('stroke', function (d) {
                return d.color
            })
            .attr('class', function () {
            })
            .call(d3.drag()
                .on('drag', nodeDragFunction)
                .on('end', () => {
                    self.update_script()
                })
            )
            .on('click', (d) => {
                this.unselect_all();
                this.select_node(this.index.lookup(d))
            });
        this.index.add_d3_group(node, 'node');
        this.node = node
    }

    drawLabels(container, labelDragFunction) {
        var self = this;
        var offset_from_top_of_node = 3;
        var label = container.append('g')
            .attr('class', 'label')
            .selectAll('text')
            .data(this.props.graph.objects)
            .enter()
            .append('text')
            .attr("text-anchor", "middle")
            .attr('x', function (d) {
                return d.x
            })
            .attr('y', function (d) {
                return d.y + offset_from_top_of_node
            })
            .attr('font-size', function (d) {
                d.text['font-size'] = 10;
                return '10px'
            })
            .text(function (d) {
                return d.name
            })
            .call(d3.drag()
                .on('drag', labelDragFunction)
                .on('end', () => {
                    self.update_script()
                })
            )
            .on('click', (d) => {
                this.unselect_all();
                this.select_node(this.index.lookup(d))
            });
        this.label = label;
        this.index.add_d3_group(label, 'label');
    }

    get_offset_between_ellipses(x1, y1, x2, y2, nodeXRad, nodeYRad, strokeWidth) {
        if (!strokeWidth) {
            strokeWidth = 1
        }
        var adjusted_x = x2 - x1;
        var adjusted_y = y2 - y1;
        var dist_between_centers = Math.sqrt(adjusted_x ** 2 + adjusted_y ** 2);
        var phi = Math.atan2(adjusted_y, adjusted_x);
        var a = parseFloat(nodeXRad) + Math.round(strokeWidth / 2);
        var b = parseFloat(nodeYRad) + Math.round(strokeWidth / 2);
        var radius_at_point = a * b / Math.sqrt(a ** 2 * Math.sin(phi) ** 2 + b ** 2 * Math.cos(phi) ** 2);
        var e_radius = dist_between_centers - radius_at_point - nodeYRad / 4;
        var new_x = (e_radius * Math.cos(phi) + x1);
        var new_y = (e_radius * Math.sin(phi) + y1);
        return {
            x: new_x,
            y: new_y
        }
    }

    fit_graph_to_workspace() {
        var self = this;
        var view_rect = document.querySelector('.graph-view')
            .getBoundingClientRect();
        this.index.nodes.forEach(
            function (node) {
                node.data.x = (view_rect.width * 0.95) * (node.data.x / (self.props.graph.max_x));
                node.data.y += (view_rect.height * 0.95) * (node.data.y / (self.props.graph.max_y));
                node.selection
                    .attr('cx', node.data.x)
                    .attr('cy', node.data.y);
            }
        );
    }

    move_graph(dx = 0, dy = 0) {
        // var stylesheet, graph_rect;
        this.index.nodes.forEach(
            (node) => {
                node.data.x += dx;
                node.data.y += dy;
                node.selection
                    .attr('cx', node.data.x)
                    .attr('cy', node.data.y);
                this.move_label_to_corresponding_node(node);
                this.refresh_edges_for_node(node);
            }
        );
    }

    resize_nodes_to_label_text() {
        this.index.nodes.forEach(
            (node) => {
                var label_radius = Math.floor((node.label.dom.getBoundingClientRect().width / 2) + 10);
                node.data.rx = label_radius;
                node.selection.attr('rx', label_radius);
            }
        );
    }

    update_scroll() {
        var win = document.querySelector('.graph-view');
        // this.set_zoom_config(null,win.scrollLeft,win.scrollTop);
    }

    apply_select_boxes() {
        var self = this;
        var svg = d3.select('svg');
        //TODO: On select, save rect of selected nodes for more efficient collision detection when dragging
        svg
            .on('mousedown', function () {
                    // don't fire if command is pressed. command unlocks different options
                    if (!(d3.event.metaKey || d3.event.ctrlKey)) {
                        var anchor_pt = d3.mouse(this);
                        var processed_anchor_pt = [
                            {anchor: {x: anchor_pt[0], y: anchor_pt[1]}}
                        ];
                        self.unselect_all();
                        svg.append('rect')
                            .attr('rx', 6)
                            .attr('ry', 6)
                            .attr('class', 'selection')
                            .data(processed_anchor_pt);
                    }
                }
            )
            .on("mousemove", function () {
                var anchor_x, anchor_y, current_x, current_y,
                    s = svg.select("rect.selection"),
                    current_pt = d3.mouse(this),
                    e = d3.event;
                e.preventDefault();
                s
                    .attr('x', (d) => {
                        anchor_x = d.anchor.x;
                        current_x = current_pt[0];
                        if (current_x > anchor_x) {
                            return anchor_x
                        } else {
                            return current_x
                        }
                    })
                    .attr('y', (d) => {
                        anchor_y = d.anchor.y;
                        current_y = current_pt[1];
                        if (current_y > anchor_y) {
                            return anchor_y
                        } else {
                            return current_y
                        }
                    })
                    .attr('width', (d) => {
                        anchor_x = d.anchor.x;
                        current_x = current_pt[0];
                        return Math.abs(anchor_x - current_x)
                    })
                    .attr('height', (d) => {
                        anchor_y = d.anchor.y;
                        current_y = current_pt[1];
                        return Math.abs(anchor_y - current_y)
                    });
                var selection_box = document.querySelector('rect.selection');
                if (selection_box) {
                    var selection_box_bounding_rect = selection_box.getBoundingClientRect();
                    var sel_x1, sel_y1, sel_x2, sel_y2;
                    sel_x1 = selection_box_bounding_rect.x;
                    sel_y1 = selection_box_bounding_rect.y;
                    sel_x2 = sel_x1 + selection_box_bounding_rect.width;
                    sel_y2 = sel_y1 + selection_box_bounding_rect.height;
                    self.index.nodes.forEach((node) => {
                        var node_rect = node.dom.getBoundingClientRect();
                        var node_x1, node_x2, node_y1, node_y2;
                        node_x1 = node_rect.x;
                        node_x2 = node_x1 + node_rect.width;
                        node_y1 = node_rect.y;
                        node_y2 = node_y1 + node_rect.height;
                        var sel_ul, sel_lr, node_ul, node_lr;
                        sel_ul = {x: sel_x1, y: sel_y1};
                        sel_lr = {x: sel_x2, y: sel_y2};
                        node_ul = {x: node_x1, y: node_y1};
                        node_lr = {x: node_x2, y: node_y2};
                        if (
                            sel_lr.x < node_ul.x ||
                            node_lr.x < sel_ul.x ||
                            sel_lr.y < node_ul.y ||
                            node_lr.y < sel_ul.y

                        ) {
                            self.unselect_node(node)
                        } else {
                            self.select_node(node)
                        }
                    })

                }
            })
            .on("mouseup", function () {
                // // Remove selection frame
                svg.selectAll("rect.selection").remove();
            })
            .on("mouseout", function () {
                // if mouse enters an area of the screen not belonging to the SVG or one of its child elements
                var toElement = d3.event.toElement;
                if (!toElement ||
                    !(toElement === svg.node() ||
                        ('ownerSVGElement' in toElement && toElement.ownerSVGElement === svg.node()))) {
                    svg.selectAll("rect.selection").remove();
                }
            })
    }

    select_node(node) {
        this.selected.add(node);
        node.selection.classed('selected', true);
    }

    unselect_node(node) {
        this.selected.delete(node);
        node.selection.classed('selected', false);
    }

    unselect_all() {
        this.index.nodes.forEach(
            (n) => {
                n.selection.classed('selected', false)
            }
        );
        this.selected = new Set()
    }

    correct_projection_lengths_for_ellipse_sizes() {
        var offset_pt, self;
        self = this;
        this.index.projections.forEach(
            (projection) => {
                offset_pt = self.get_offset_points_for_projection(projection);
                projection.selection
                    .attr('x2', offset_pt.x)
                    .attr('y2', offset_pt.y)
            }
        )
    }

    get_offset_points_for_projection(projection) {
        return this.get_offset_between_ellipses(
            projection.tail_node.data.x,
            projection.tail_node.data.y,
            projection.head_node.data.x,
            projection.head_node.data.y,
            projection.head_node.data.rx,
            projection.head_node.data.ry,
            projection.head_node.data.stroke_width)
    }

    get_viewport_offset() {
        var viewbox = this.get_viewBox(),
            canvasbox = this.get_canvas_bounding_box()
        return {
            x: (canvasbox.width - viewbox.width),
            y: (canvasbox.height - viewbox.height)
        }
    }

    adjust_node_movement(node, dx, dy) {
        var canvasbox = this.get_canvas_bounding_box(),
            viewport_offset = this.get_viewport_offset(),
            w_correction = viewport_offset.x / 2,
            h_correction = viewport_offset.y / 2,
            min_bound_w = -Math.abs(w_correction),
            min_bound_h = -Math.abs(h_correction),
            max_bound_w = canvasbox.width - w_correction,
            max_bound_h = canvasbox.height - h_correction,
            node_left_x = node.data.x - node.data.rx - node.data.stroke_width / 2,
            node_top_y = node.data.y - node.data.ry - node.data.stroke_width / 2,
            node_right_x = node.data.x + node.data.rx + node.data.stroke_width / 2,
            node_bottom_y = node.data.y + node.data.ry + node.data.stroke_width / 2;
        if ((dx < 0) && (node_left_x + dx < min_bound_w)) {
            dx = min_bound_w - node_left_x
        } else if ((dx > 0) && (node_right_x + dx > max_bound_w)) {
            dx = max_bound_w - node_right_x
        }

        if ((dy < 0) && (node_top_y + dy < min_bound_h)) {
            dy = min_bound_h - node_top_y
        } else if ((dy > 0) && (node_bottom_y + dy > max_bound_h)) {
            dy = max_bound_h - node_bottom_y
        }
        return (
            {
                dx: dx,
                dy: dy,
            }
        );
    };

    node_movement_within_canvas_bounds(node, dx, dy) {
        var canvasbox = this.get_canvas_bounding_box(),
            viewport_offset = this.get_viewport_offset(),
            w_correction = viewport_offset.x / 2,
            h_correction = viewport_offset.y / 2,
            min_bound_w = 0 - w_correction,
            min_bound_h = 0 - h_correction,
            max_bound_w = canvasbox.width - w_correction,
            max_bound_h = canvasbox.height - h_correction;
        return (
            {
                x: (node.data.x - node.data.rx - node.data.stroke_width / 2 + dx >= min_bound_w &&
                    node.data.x + node.data.rx + node.data.stroke_width / 2 + dx <= max_bound_w),
                y: (node.data.y - node.data.ry - node.data.stroke_width / 2 + dy >= min_bound_h &&
                    node.data.y + node.data.ry + node.data.stroke_width / 2 + dy <= max_bound_h),
            }
        );
    }

    move_nodes(dx, dy) {
        var adjusted_movement;
        var self = this;
        self.selected.forEach(
            (s) => {
                adjusted_movement = self.adjust_node_movement(s, dx, dy)
                dx = adjusted_movement.dx;
                dy = adjusted_movement.dy;
            }
        );
        self.selected.forEach(
            (s) => {
                self.move_node(s, dx, dy)
            }
        );
        this.update_script();
    }

    get_viewBox() {
        var svg = document.querySelector('svg'),
            viewBox = svg.getAttribute('viewBox').split(',');
        return {
            minX: parseInt(viewBox[0]),
            minY: parseInt(viewBox[1]),
            width: parseInt(viewBox[2]),
            height: parseInt(viewBox[3])
        }
    }

    commit_canvas_size_to_stylesheet() {
        var full_canvas_rect = document.querySelector('.graphview').getBoundingClientRect(),
            x_res = window.innerWidth,
            y_res = window.innerHeight;
        this.stylesheet['Canvas Settings']['Width'] = parseFloat((full_canvas_rect.width / x_res * 100).toFixed(2));
        this.stylesheet['Canvas Settings']['Height'] = parseFloat((full_canvas_rect.height / y_res * 100).toFixed(2));
    }

    commit_all_nodes_to_stylesheet() {
        this.index.nodes.forEach(
            (node) => {
                this.commit_node_to_stylesheet(node);
            }
        )
    }

    commit_node_to_stylesheet(node) {
        var viewbox = this.get_viewBox(),
            viewport_offset = this.get_viewport_offset(),
            w_correction = viewport_offset.x,
            h_correction = viewport_offset.y;
        this.stylesheet['Graph Settings']['Components']['Nodes'][node.name] =
            {
                'x': +(((node.data.x - node.data.rx - (node.data.stroke_width * this.scaling_factor / 2) + w_correction / 2) / (viewbox.width + w_correction)) * 100).toFixed(2),
                'y': +(((node.data.y - node.data.ry - node.data.stroke_width * this.scaling_factor / 2 + h_correction / 2) / (viewbox.height + h_correction)) * 100).toFixed(2)
            };
    }

    move_node(node, dx, dy) {
        node.data.x += dx;
        node.data.y += dy;
        node.data.x = +(node.data.x).toFixed(0);
        node.data.y = +(node.data.y).toFixed(0);
        node.selection
            .attr('cx', node.data.x)
            .attr('cy', node.data.y);
        this.commit_node_to_stylesheet(node);
        this.move_label_to_corresponding_node(node);
        this.refresh_edges_for_node(node);
    }

    drag_selected(origin) {
        var origin_drag_node = this.index.lookup(origin),
            self = this;
        if (!self.selected.has(origin_drag_node)) {
            self.unselect_all();
            self.select_node(origin_drag_node);
        }
        var dx = d3.event.dx,
            dy = d3.event.dy;
        self.move_nodes(dx, dy);
    }

    move_label_to_corresponding_node(node) {
        node.label.selection
            .attr('x', node.data.x)
            .attr('y', node.data.y + node.data.ry / 5);
    }

    gen_arc(phi1, phi2, innerRad, outerRad) {
        return d3.arc()
            .startAngle(phi1)
            .endAngle(phi2)
            .innerRadius(innerRad)
            .outerRadius(outerRad)()
    }

    CalculateCircleCenter(A, B, C) {
        var ax = (A.x + B.x) / 2,
            ay = (A.y + B.y) / 2,
            ux = (A.y - B.y),
            uy = (B.x - A.x),
            bx = (B.x + C.x) / 2,
            by = (B.y + C.y) / 2,
            vx = (B.y - C.y),
            vy = (C.x - B.x),
            dx = ax - bx,
            dy = ay - by,
            vu = vx * uy - vy * ux,
            g = (dx * uy - dy * ux) / vu,
            center = {
                x: bx + g * vx,
                y: by + g * vy
            };
        if (vu == 0)
            return false; // Points are collinear, so no unique solution
        return center;
    }

    refresh_edges_for_node(node) {
        var self, offset_pt, recurrent_projs;
        recurrent_projs = new Set();
        self = this;
        node.efferents.forEach(
            (projection) => {
                offset_pt = self.get_offset_points_for_projection(projection);
                projection.selection
                    .attr('x1', projection.data.tail_node.x)
                    .attr('y1', projection.data.tail_node.y)
                    .attr('x2', offset_pt.x)
                    .attr('y2', offset_pt.y);
                if (projection.is_recurrent()) {
                    recurrent_projs.add(projection)
                }
            }
        );
        node.afferents.forEach(
            (projection) => {
                offset_pt = self.get_offset_points_for_projection(projection);
                projection.selection
                    .attr('x2', offset_pt.x)
                    .attr('y2', offset_pt.y);
                if (projection.is_recurrent()) {
                    recurrent_projs.add(projection)
                }
            }
        );
        recurrent_projs.forEach(
            (projection) => {
                var start_phi = -2.5;
                var xrad = projection.head_node.data.rx;
                var yrad = projection.head_node.data.ry;
                var radius_at_point = xrad * yrad / Math.sqrt(xrad ** 2 * Math.sin(start_phi) ** 2 + yrad ** 2 * Math.cos(start_phi) ** 2);
                radius_at_point += projection.head_node.data.stroke_width / 2;
                var stpt = {
                    x: radius_at_point * Math.cos(start_phi),
                    y: radius_at_point * Math.sin(start_phi)
                };
                var endpt = {
                    x: stpt.x,
                    y: stpt.y * -1
                };
                var lftedge_offset = projection.head_node.dom.getBoundingClientRect().height / 2
                var lftedge = {
                    x: -projection.head_node.data.rx - lftedge_offset - projection.head_node.data.stroke_width,
                    y: 0
                };
                var ctpt = this.CalculateCircleCenter(stpt, endpt, lftedge);
                var radius = ctpt.x - lftedge.x;
                if (projection.dom.constructor.name === 'SVGPathElement') {
                    var arc_start_angle = Math.atan2(stpt.y - ctpt.y, stpt.x - ctpt.x);
                    var arc_end_angle = Math.atan2(endpt.y - ctpt.y, endpt.x - ctpt.x);
                    var test_arc = this.gen_arc(arc_end_angle, 2 * Math.PI + arc_start_angle, radius, radius)
                    var path = test_arc.toString()
                    projection.selection.attr('d', path);
                    projection.selection
                        .attr('transform', `translate(${projection.data.head_node.x + ctpt.x},${projection.data.head_node.y}) rotate(90)`)
                } else {
                    var circ = 2 * Math.PI * radius;
                    var rad_per_px = 2 * Math.PI / circ;
                    var adjustment = projection.data.head_node.ry / 4.2;
                    var arc_end_angle = Math.atan2(stpt.y - ctpt.y, stpt.x - ctpt.x) - (rad_per_px * adjustment);
                    var x1 = (radius * Math.cos(arc_end_angle - 0.01));
                    var y1 = (radius * Math.sin(arc_end_angle - 0.01));
                    var x2 = (radius * Math.cos(arc_end_angle));
                    var y2 = (radius * Math.sin(arc_end_angle));
                    projection.selection
                        .attr('x1', projection.data.head_node.x + ctpt.x + x1)
                        .attr('y1', projection.data.head_node.y - y1)
                        .attr('x2', projection.data.head_node.x + ctpt.x + x2)
                        .attr('y2', projection.data.head_node.y - y2)
                }
            }
        );
    }

    scroll_graph_into_view() {
        var horizontal_offset, vertical_offset, graph_bounding_box;
        graph_bounding_box = this.get_graph_bounding_box();
        if (graph_bounding_box.x < 0) {
            horizontal_offset = Math.abs(0 - graph_bounding_box.x)
        } else {
            horizontal_offset = 0
        }
        if (graph_bounding_box.y < 0) {
            vertical_offset = Math.abs(0 - graph_bounding_box.y)
        } else {
            vertical_offset = 0
        }
        this.move_graph(horizontal_offset, vertical_offset)
    }

    scale_graph(scale_by) {
        this.scaling_factor *= scale_by;
        this.validate_stylesheet();
        var zoom_factor = this.stylesheet['Canvas Settings']['Zoom'] / 100;
        this.stylesheet['Graph Settings']['Scale'] = +(this.scaling_factor).toFixed(2);
        var self = this;
        this.index.nodes.forEach(
            (node) => {
                var cx = node.selection.attr('cx') * scale_by,
                    cy = node.selection.attr('cy') * scale_by,
                    rx = node.selection.attr('rx') * scale_by,
                    ry = node.selection.attr('ry') * scale_by,
                    stroke_width = node.selection.attr('stroke-width') * scale_by,
                    font_size = node.label.data.text['font-size'] * scale_by;
                node.data.x = cx;
                node.data.y = cy;
                node.data.rx = rx;
                node.data.ry = ry;
                node.data.stroke_width = stroke_width;
                node.selection.attr('cx', cx);
                node.selection.attr('cy', cy);
                node.selection.attr('rx', rx);
                node.selection.attr('ry', ry);
                node.selection.attr('stroke-width', stroke_width);
                node.label.data.text['font-size'] = font_size;
                node.label.selection.attr('font-size', font_size);
                self.move_label_to_corresponding_node(node);
                self.refresh_edges_for_node(node);
            }
        );
        this.index.projections.forEach(
            (projection) => {
                var stroke_width = projection.dom.getAttribute('stroke-width') * scale_by;
                projection.data.stroke_width = stroke_width
                projection.selection.attr('stroke-width', stroke_width);
            }
        );
    }

    scale_graph_in_place(scaling_factor) {
        var pre_scale_graph_rect = document.querySelector('g.container').getBoundingClientRect(),
            pre_scale_centerpoint = {
                x: (pre_scale_graph_rect.x + pre_scale_graph_rect.width / 2),
                y: (pre_scale_graph_rect.y + pre_scale_graph_rect.height / 2)
            };
        this.scale_graph(scaling_factor);
        var post_scale_graph_rect = document.querySelector('g.container').getBoundingClientRect(),
            post_scale_centerpoint = {
                x: (post_scale_graph_rect.x + post_scale_graph_rect.width / 2),
                y: (post_scale_graph_rect.y + post_scale_graph_rect.height / 2)
            },
            dx = pre_scale_centerpoint.x - post_scale_centerpoint.x,
            dy = pre_scale_centerpoint.y - post_scale_centerpoint.y;
        this.move_graph(dx, dy)
    }

    scale_graph_to_fit(proportion) {
        var canvas_bounding_box, graph_bounding_box, target_width, target_height, scaling_factor;
        this.fill_proportion = proportion;
        this.scale_graph(1);
        canvas_bounding_box = this.get_canvas_bounding_box();
        graph_bounding_box = this.get_graph_bounding_box();
        target_width = Math.floor(canvas_bounding_box.width * proportion * .99);
        target_height = Math.floor(canvas_bounding_box.height * proportion * .99);
        scaling_factor = Math.min(
            Math.floor(((target_width / graph_bounding_box.width) * 100)) / 100,
            Math.floor(((target_height / graph_bounding_box.height) * 100)) / 100,
        );
        this.scale_graph(scaling_factor);
    }

    get_canvas_bounding_box() {
        var canvas_rect = document.querySelector('.graph').getBoundingClientRect();
        return canvas_rect;
    }

    get_graph_bounding_box() {
        var g_container, graph_rect, canvas_rect, x, y, width, height, centerpoint;
        g_container = document.querySelector('g.container');
        graph_rect = g_container.getBoundingClientRect();
        canvas_rect = this.get_canvas_bounding_box()
        x = graph_rect.x - canvas_rect.x;
        y = graph_rect.y - canvas_rect.y;
        width = graph_rect.width;
        height = graph_rect.height;
        centerpoint = {
            x: width / 2 + x,
            y: height / 2 + y
        };
        return {
            x: x,
            y: y,
            width: width,
            height: height,
            centerpoint: centerpoint
        }
    }

    center_graph() {
        var centerpoint, graph_bounding_box, canvas_bounding_box, vertical_offset, horizontal_offset;
        graph_bounding_box = this.get_graph_bounding_box();
        canvas_bounding_box = this.get_canvas_bounding_box();
        centerpoint = {x: canvas_bounding_box.width / 2, y: canvas_bounding_box.height / 2};
        horizontal_offset = centerpoint.x - graph_bounding_box.centerpoint.x;
        vertical_offset = centerpoint.y - graph_bounding_box.centerpoint.y;
        this.move_graph(horizontal_offset, vertical_offset)
    }

    set_dirty_flag_to_false() {
        this.flags.dirty = false;
    }

    on_zoom() {
        this.flags.dirty = true;
        var d3e = d3.select('svg.graph');
        var win = document.querySelector('.graph-view')
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'mousemove') {
            if (d3.event.sourceEvent.metaKey || d3.event.sourceEvent.ctrlKey) {
                var xscroll = win.scrollLeft - d3.event.sourceEvent.movementX;
                var yscroll = win.scrollTop - d3.event.sourceEvent.movementY;
            } else {
                var xScroll = win.scrollLeft;
                var yScroll = win.scrollTop;
            }
        } else {
            var full_g_pre = document.querySelector('svg.graph');
            var full_g_box_pre = full_g_pre.getBoundingClientRect();
            var pre_scale_x_proportion = this.mouse_offset.x / full_g_box_pre.width;
            var pre_scale_y_proportion = this.mouse_offset.y / full_g_box_pre.height;
            var new_scale = 100 * d3.event.transform.k;
            d3e
                .attr('width', `${new_scale}%`)
                .attr('height', `${new_scale}%`);
            var full_g_post = document.querySelector('svg.graph');
            var full_g_box_post = full_g_post.getBoundingClientRect();
            var xscroll_offset = full_g_box_post.width * pre_scale_x_proportion - this.mouse_offset.x;
            var xscroll = win.scrollLeft + xscroll_offset;
            var yscroll_offset = full_g_box_post.height * pre_scale_y_proportion - this.mouse_offset.y;
            var yscroll = win.scrollTop + yscroll_offset;
        }
        if (xscroll < 0) {
            xscroll = 0
        }
        ;
        if (yscroll < 0) {
            yscroll = 0
        }
        ;
        win.scrollTo(xscroll, yscroll);
        this.redimension_viewbox();
        this.set_dirty_flag_to_false();
    }

    get_scroll_bounds() {
        var win = document.querySelector('.graph-view'),
            xmax = win.scrollWidth - win.clientWidth,
            ymax = win.scrollHeight - win.clientHeight
        return {
            x: xmax,
            y: ymax
        }
    }

    commit_zoom_to_stylesheet() {
        var win = document.querySelector('.graph-view'),
            svg = document.querySelector('svg'),
            k = parseInt(svg.getAttribute('width')),
            scroll_bounds = this.get_scroll_bounds(),
            xscroll = win.scrollLeft,
            xmax = scroll_bounds.x,
            xpro = Math.round(xscroll / xmax * 100),
            xpro = isNaN(xpro) ? 0 : xpro,
            yscroll = win.scrollTop,
            ymax = scroll_bounds.y,
            ypro = Math.round(yscroll / ymax * 100),
            ypro = isNaN(ypro) ? 0 : ypro,
            // scale = parseFloat((this.scaling_factor/(k/100)).toFixed(2));
            scale = +this.scaling_factor.toFixed(2);
        this.stylesheet['Canvas Settings']['Zoom'] = k;
        this.stylesheet['Graph Settings']['Scale'] = scale;
        this.stylesheet['Canvas Settings']['xScroll'] = xpro;
        this.stylesheet['Canvas Settings']['yScroll'] = ypro;
    }

    apply_zoom(svg) {
        var zoom = d3.zoom();
        this.zoom = zoom
            .scaleExtent([1, 3])
            .filter(() => {
                return d3.event.type.includes("mouse")
                    && (
                        d3.event.ctrlKey
                        || d3.event.metaKey
                        || (d3.event.sourceEvent && !d3.event.sourceEvent.type === "wheel")
                    )
            });
        var d3e = d3.select('svg.graph');
        d3e.call(this.zoom
            .on("zoom", this.on_zoom)
        );
    }

    bind_scroll_updating() {
        var win = document.querySelector('.graph-view');
        var self = this;
        var delayedExec = function (after, fn) {
            var timer;
            return function () {
                timer && clearTimeout(timer);
                timer = setTimeout(fn, after);
            };
        };
        var scrollStopper = delayedExec(500, function () {
            self.commit_to_stylesheet_and_update_script();
        });
        win.addEventListener('scroll', scrollStopper);
    }

    parse_stylesheet() {
        var self, stylesheet;
        self = this;
        self.validate_stylesheet();
        self.set_canvas_state_from_stylesheet();
    }

    set_canvas_state_from_stylesheet() {
        var self = this,
            width = self.stylesheet['Canvas Settings']['Width'],
            height = self.stylesheet['Canvas Settings']['Height'],
            zoom = self.stylesheet['Canvas Settings']['Zoom'],
            win = document.querySelector('.graph-view');
        this.svg.call(this.zoom.scaleTo, zoom / 100);
        self.props.graph_size_fx(width, height, () => {
            self.flags.reload_locations = true;
            var scroll_bounds = self.get_scroll_bounds(),
                xScroll = self.stylesheet['Canvas Settings']['xScroll'],
                yScroll = self.stylesheet['Canvas Settings']['yScroll'];
            win.scrollTo(scroll_bounds.x * (xScroll / 100), scroll_bounds.y * (yScroll / 100));
            self.forceUpdate();
        });
    }

    set_node_positioning_from_stylesheet() {
        var self = this,
            stylesheet = self.stylesheet,
            pnlv_node, nodes, cx, cy, scale, zoom;
        if (Object.keys(self.props.graph_style).length > 0) {
            nodes = Object.keys(stylesheet['Graph Settings']['Components']['Nodes']);
            zoom = stylesheet['Canvas Settings']['Zoom'];
            scale = self.props.graph_style['Graph Settings']['Scale']
            // *(zoom/100);
            this.scale_graph_in_place(scale / this.scaling_factor);
            var viewbox = this.get_viewBox(),
                viewbox_w = viewbox.width,
                viewbox_h = viewbox.height,
                viewport_offset = this.get_viewport_offset(),
                w_correction = viewport_offset.x,
                h_correction = viewport_offset.y;
            nodes.forEach(
                (node) => {
                    pnlv_node = self.index.lookup(node);
                    cx =
                        stylesheet['Graph Settings']['Components']['Nodes'][node].x * (viewbox_w + w_correction) / 100
                        + pnlv_node.data.rx
                        + pnlv_node.data.stroke_width / 2
                        - w_correction / 2;
                    cy =
                        stylesheet['Graph Settings']['Components']['Nodes'][node].y * (viewbox_h + h_correction) / 100
                        + pnlv_node.data.ry
                        + pnlv_node.data.stroke_width / 2
                        - h_correction / 2;
                    pnlv_node.data.x = cx;
                    pnlv_node.data.y = cy;
                    pnlv_node.selection
                        .attr('cx', pnlv_node.data.x)
                        .attr('cy', pnlv_node.data.y);
                    self.move_label_to_corresponding_node(pnlv_node);
                    self.refresh_edges_for_node(pnlv_node);
                }
            );
        }
    }

    set_index() {
        this.index = new Index();
        return this.index;
    }

    draw_elements() {
        var container = this.createSVG(),
            self = this;
        this.set_aspect_ratio();
        this.drawProjections(container);
        this.drawNodes(container, (node) => {
            self.drag_selected(node)
        });
        this.drawLabels(container, (label) => {
            self.drag_selected(label)
        });
        this.postprocess();
    }

    redimension_viewbox() {
        var svg = document.querySelector('svg'),
            viewBox = svg.getAttribute('viewBox').split(','),
            viewBox_w = parseInt(viewBox[2]),
            viewBox_h = parseInt(viewBox[3]),
            svg_w = Math.round(svg.getBoundingClientRect().width),
            svg_h = Math.round(svg.getBoundingClientRect().height),
            aspect_ratio = this.props.aspect_ratio,
            w_difference = svg_w - viewBox_w,
            h_difference = svg_h - viewBox_h,
            viewBox_w_mod,
            viewBox_h_mod,
            proportion;
        if (svg_w !== viewBox_w || svg_h !== viewBox_h) {
            if (w_difference < h_difference) {
                viewBox_w_mod = svg_w;
                viewBox_h_mod = svg_w / aspect_ratio;
            } else {
                viewBox_h_mod = svg_h;
                viewBox_w_mod = svg_h * aspect_ratio;
            }
            var w_proportion = viewBox_w_mod / viewBox_w,
                h_proportion = viewBox_h_mod / viewBox_h;
            proportion = Math.min(w_proportion, h_proportion);
            svg.setAttribute('viewBox', [0, 0, viewBox_w_mod, viewBox_h_mod]);
            this.scale_graph(proportion);
            this.forceUpdate();
        }
    }

    postprocess() {
        this.validate_stylesheet();
        this.resize_nodes_to_label_text();
        this.correct_projection_lengths_for_ellipse_sizes();
        this.scale_graph_to_fit(this.fill_proportion);
        this.center_graph();
        this.set_aspect_ratio();
    }

    set_aspect_ratio() {
        if (!this.props.aspect_ratio){
            store.dispatch(setModelAspectRatio(this.props.size.width / this.props.size.height));
        }
    }

    setGraph() {
        this.set_non_react_state();
        this.set_index();
        this.draw_elements();
        this.parse_stylesheet();
        this.setState({mounted: true});
        window.this = this
    }

    render() {
        return (
            <Resizable
                style={style}
                onResize={this.props.onResize}
                onResizeStart={this.props.onResizeStart}
                onResizeStop={this.props.onResizeStop}
                enable={{
                    top: false,
                    right: false,
                    bottom: true,
                    left: true,
                    topRight: false,
                    bottomRight: false,
                    bottomLeft: true,
                    topLeft: false
                }}
                className='graphview'
                defaultSize={
                    this.props.defaultSize
                }
                size={
                    this.props.size
                }
                minHeight={
                    40
                }
                minWidth={
                    40
                }
                maxWidth={
                    this.props.maxWidth
                }
                maxHeight={
                    this.props.maxHeight
                }
            >
                <div className={this.state.class}/>
                <div className={'spinner'}
                     style={
                         {
                             "position": "absolute",
                         }
                     }
                >
                    {
                        this.state.spinner_visible ?
                            <Spinner
                                className={"graph_loading_spinner"}/> :
                            <div/>
                    }
                </div>
            </Resizable>
        )
    }
}

const mapStateToProps = state => {
    return {
        graph_style: state.stylesheet,
        stylesheet: state.stylesheet,
        aspect_ratio: state.model_aspect_ratio
    }
};

export default connect(mapStateToProps, {setStyleSheet, setModelAspectRatio})(D3model)