import React from 'react'
import { Formik } from 'formik'
import { SubmitButton, Input, Checkbox,
    ResetButton, FormikDebug, Form, FormItem} from "formik-antd"
import { message, Button, Row, Col, Divider } from "antd"
import { Persist } from 'formik-persist'
import SelectedDataSourceTable from "../selected-data-source-table";
import {Tab, Tabs} from "@blueprintjs/core";
import {store} from "../../state/store";
import {setActiveParamTab} from "../../state/core/actions";
import {registerMechanism} from "../../state/psyneulink/actions";
import {setMainTabFocus} from "../../state/configuration/actions";
import '../../css/paramform.css';
import AvailableDataSourceTable from "../available-data-source-table";
import {connect} from "react-redux";
import * as _ from 'lodash'
import {getMapParentIdToTabFocus} from "../../state/subplot-config-form/selectors";
import {setTabFocus} from "../../state/subplot-config-form/actions";

function validateRequired(value) {
}

const mapStateToProps = ({core, subplotConfigForm}) => {
    return {
        mapIdToTabFocus: getMapParentIdToTabFocus(subplotConfigForm),
        activeComposition: core.activeComposition
    }
};

const mapDispatchToProps = dispatch => (
    {
        registerMechanism: mechanismName => dispatch(registerMechanism(mechanismName)),
        setTabFocus: ({parentId, tabKey})=>dispatch(setTabFocus({parentId, tabKey}))
    }
);

const electron = window.require('electron');
const ipcRenderer  = electron.ipcRenderer;
const rpc = window.interfaces.rpc;

class SubplotConfigForm extends React.Component{

    constructor(props) {
        super(props);
        this.bindThisToFunctions = this.bindThisToFunctions.bind(this);
        this.bindThisToFunctions();
        ipcRenderer.on(
            'componentList', (event, message)=> {
                message.forEach(m=>this.props.registerMechanism(m));
                this.setState({components:message})
            }
        );
        this.state = {
            activeTab:`${this.props.id}-data`,
            components:[]
        };
    }

    bindThisToFunctions(){
        this.render = this.render.bind(this);
        this.handleTabChange = this.handleTabChange.bind(this);
        this.setComposition = this.setComposition.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.getOptionsForm = this.getOptionsForm.bind(this);
        this.getDataForm = this.getDataForm.bind(this);
        this.getActiveForm = this.getActiveForm.bind(this);
    }

    componentDidMount() {
        if (this.props.activeComposition !== ''){
            this.setComposition();
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.activeComposition !== this.props.activeComposition){
            this.setComposition();
        }
    }

    setComposition(){
        if (this.props.activeComposition !== ''){rpc.get_components(this.props.activeComposition)}
    }


    handleTabChange(new_tab_id, prev_tab_id, e) {
        let {id, setTabFocus} = this.props;
        this.setState({activeTab:new_tab_id});
        setTabFocus({parentId:id, tabKey:new_tab_id});
    }

    getDataForm(){
        var tableHeight = this.props.size.height - (this.props.padding * 2);
        return([
            <Divider type={'vertical'}/>,
            <AvailableDataSourceTable name={`${this.props.id}-available-data`} id={this.props.id} components={this.state.components} size={{height: tableHeight, width:"100%"}}/>,
            <Divider type={'vertical'}/>,
            <SelectedDataSourceTable name={`${this.props.id}-selected-data`} id={this.props.id} size={{height: tableHeight, width:"100%"}}/>
        ])
    }

    getOptionsForm(){
        return [<div/>,<div/>,<div/>,<div/>]
    }

    getActiveForm(){
        let {id, mapIdToTabFocus} = this.props;
        switch (mapIdToTabFocus[id]) {
            case 'configure':
                return this.getOptionsForm();
            case 'data':
                return this.getDataForm();
            default:
                return this.getOptionsForm();
        }
    }

    render() {
        var tabs = [
            <Tab key={'configure'} id={'configure'} title= {'Configure'}/>,
            <Tab key={'data'} id={'data'} title= {'Data'}/>
        ];

        return <Formik
            initialValues={{}}
            onSubmit={
                (values,actions)=>{
                    message.info(JSON.stringify(values, null, 4));
                    actions.setSubmitting(false);
                    actions.resetForm();
                }
            }>
                <Form
                    style={{
                        padding:`${this.props.padding}px`,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 50fr 1fr 50fr",
                        height: this.props.size.height,
                        ...this.props.style
                    }}
                    labelCol={{ m: 4 }}
                    wrapperCol={{ m: 2 }}
                >
                    <div className={'vertical-tab-container'}>
                        <Tabs id="param-tab-group"
                              className={'vertical'}
                              onChange={this.handleTabChange}
                              selectedTabId={this.props.mapIdToTabFocus[this.props.id] ?? 'configure'}
                              vertical={true}>
                            {tabs}
                        </Tabs>
                    </div>
                    {this.getActiveForm()}
                </Form>
        </Formik>;
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(SubplotConfigForm)