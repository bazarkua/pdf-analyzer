import React, { Component, Fragment } from 'react';
import { Button, Checkbox, Modal, notification, Popconfirm, Table, Tooltip, Row, Col, Icon } from 'antd';
import { instanceOf, object } from 'prop-types';
import { withCookies, Cookies } from 'react-cookie';
import { createHashHistory } from 'history'
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { CSVLink } from "react-csv";
import ReactDataSheet from "react-datasheet";
import 'react-datasheet/lib/react-datasheet.css';
import moment from 'moment';

import Style from '../css/JobHistory.module.css'
import '../css/GlobalStyles.css';
import { Translator, Translate } from 'react-auto-translate'

const appConfig = require('../config.json');

/* Constructs the spreadsheet containing the job results. Can also compare multiple jobs.
 * The function will be exported so that the jobResults page can use it as well. */
export const BuildSpreadsheet = function (keys, jobHistory, justifications, locale) {

	/* Arrays to hold data. Separate arrays for spreadsheet and export, since format is different. */
	var spreadsheetData = [];
	var spreadsheetTemp = [];
	var exportData = [];
	var exportTemp = [];

	/* Get list of all Json keys */
	var rowName = Object.entries(jobHistory[0])[0][1];
	var keyList = [];
	Object.keys(rowName).map((val) => {
		keyList.push(val);
	});


	/* Get the data from the row in the table, organize it. */
	var currentData = [];

	/* The first column that holds the labels. Empty. */
	spreadsheetTemp.push({ value: '', width: 150, readOnly: true });
	exportTemp.push("");

	/* For each jobID passed, get that job from the jobHistory object. Display Job ID and Job Name*/
	var id = 0;
	for (let i = 0; i < keys.length; i++) {
		currentData = jobHistory.filter(obj => {
			if (Object.entries(obj)[0][0] === keys[i]){
				id = Object.entries(obj)[0][0];
				return keys[i];	
			}
		})[0];

		/* Column for each job being compared. If justifications are on, additional
		 * column to the right and the header column (Job #) spans two columns. */
		if (justifications) {
			spreadsheetTemp.push({ value: 'Job ' + Object.keys(currentData) + ", " + currentData[id].jobName, colSpan: 2, readOnly: true });
			exportTemp.push('Job ' + Object.keys(currentData) + ", " + currentData[id].jobName);
			exportTemp.push('Job ' + Object.keys(currentData) + ' Justifications');
		} else {
			spreadsheetTemp.push({ value: 'Job ' + Object.keys(currentData) + ", " + currentData[id].jobName, width: 175, readOnly: true });
			exportTemp.push('Job ' + Object.keys(currentData) + ", " + currentData[id].jobName);
		}
	}

	/* Push temp data to main object, clear temp data. */
	spreadsheetData.push(spreadsheetTemp);
	spreadsheetTemp = [];
	exportData.push(exportTemp);
	exportTemp = [];

	/* Runs through the list of all keys, making a row for each */
	for (let j = 0; j < keyList.length; j++) {
		/* If the key is not input or output properties or explanation, directly display the value */
		if (keyList[j] !== 'inputProperties' && keyList[j] !== 'calculatedProperties' && keyList[j] !== 'propertyExplanations') {
			/* Make a row label for that key in keyList. */
			spreadsheetTemp.push({ value: keyList[j], width: 150, readOnly: true });
			exportTemp.push(keyList[j]);

			/* Runs through the data in each job, pairing it with the label. */
			for (let k = 0; k < keys.length; k++) {
				currentData = [];
				id = 0;
				currentData = jobHistory.filter(obj => {
					if (Object.entries(obj)[0][0] === keys[k]){
						id = Object.entries(obj)[0][0];
						return keys[k];	
					}
				})[0];

				/* If justifications are enabled, make 'input' data span 2 columns.
				 * Otherwise, make it only one column of width 175px. */
				if (justifications) {
					Object.entries(currentData[id]).map(val => {
						if (val[0] == keyList[j]){
							spreadsheetTemp.push({ value: val[1], colSpan: 2 });
							exportTemp.push(val[1]);
							exportTemp.push("");	
						}
					})
				} else {
					Object.entries(currentData[id]).map(val => {
						if (val[0] == keyList[j]){
							spreadsheetTemp.push({ value: val[1], width: 175 });
							exportTemp.push(val[1]);
						}
					})
				}
			}

			/* Push temp data to main object, clear temp data. */
			spreadsheetData.push(spreadsheetTemp);
			spreadsheetTemp = [];
			exportData.push(exportTemp);
			exportTemp = [];
		}
		/* If the key is input or output properties, then keep it empty and fill the child keys instead */
		else if ((keyList[j] == 'inputProperties' || keyList[j] == 'calculatedProperties') && keyList[j] !== 'propertyExplanations'){
			/* Add the row header for the key. */
			spreadsheetTemp.push({ value: keyList[j].toLocaleUpperCase(), width: 150, readOnly: true });
			exportTemp.push(keyList[j].toLocaleUpperCase());

			/* Empty space for that row. */
			for (let k = 0; k < keys.length; k++) {
				if (justifications) {
					/* Justifications for result. */
					spreadsheetTemp.push({ value: '', colSpan: 2 });
					exportTemp.push("");
					exportTemp.push("");
				} else {
					spreadsheetTemp.push({ value: '', width: 175 });
					exportTemp.push("");
				}
			}

			/* Push temp data to main object, clear temp data. */
			spreadsheetData.push(spreadsheetTemp);
			spreadsheetTemp = [];
			exportData.push(exportTemp);
			exportTemp = [];

			/* Getting the child keys/sub keys for input and output properties */
			var subKeyList = [];
			if (keyList[j] == 'inputProperties'){
				for (let n = 0; n < Object.keys(currentData[id].inputProperties).length; n++) {
					subKeyList.push(Object.entries(currentData[id].inputProperties)[n][0]);
				}
			}
			else if (keyList[j] == 'calculatedProperties'){
				for (let n = 0; n < Object.keys(currentData[id].calculatedProperties).length; n++) {
					subKeyList.push(Object.entries(currentData[id].calculatedProperties)[n][0]);
				}	
			}

			/* Run through subKeyList object, adding rows and values for each key. */
			for (let n = 0; n < subKeyList.length; n++) {
				/* Add the row header for the key. */
				spreadsheetTemp.push({ value: subKeyList[n], width: 150, readOnly: true });
				exportTemp.push(subKeyList[n]);

				/* Append info to row for each job. */
				for (let m = 0; m < keys.length; m++) {
					/* Get the data for the job based on the currently selected id. */
					currentData = jobHistory.filter(obj => {
						if (Object.entries(obj)[0][0] === keys[m]){
							id = Object.entries(obj)[0][0];
							return keys[m];	
						}
					})[0];

					/* Convert booleans to strings if need be. */
					if (keyList[j] == 'inputProperties'){
						var tempVal = Object.entries(currentData[id].inputProperties)[n][1];
					}
					else if (keyList[j] == 'calculatedProperties'){
						var tempVal = Object.entries(currentData[id].calculatedProperties)[n][1];	
					}
					if (typeof tempVal === 'boolean')
						tempVal = tempVal.toString();

					/* If justifications are active, make 'input' values span 2 columns (since there's no justification for them),
					 * handle output values normally. If justifications are not active, don't make input values span 2 columns. */
					if (justifications) {
						if (keyList[j] === 'inputProperties') {
							spreadsheetTemp.push({ value: tempVal, colSpan: 2 });
							exportTemp.push(tempVal);
							exportTemp.push("");
						} else if (keyList[j] == 'calculatedProperties'){
							spreadsheetTemp.push({ value: tempVal, width: 175 });
							exportTemp.push(tempVal);
							exportTemp.push("");
							var explanation = "" + (Object.entries(currentData[id].propertyExplanations)[n][1]);
							if (explanation != 'undefined'){ 
								spreadsheetTemp.push({ value: <Translator
								to={locale}
								from='en'
								googleApiKey={appConfig.googleApiKey}><Translate>{explanation}</Translate></Translator>, width: 250 });
							}
							else{
								spreadsheetTemp.push({ value: (Object.entries(currentData[id].propertyExplanations)[n]), width: 250 });	
							}
							exportTemp.push(Object.entries(currentData[id].propertyExplanations)[n]);
						}
					} else {
						spreadsheetTemp.push({ value: tempVal, width: 175 });
						exportTemp.push(tempVal);
					}
				}

				/* Push temp data to main object, clear temp data. */
				spreadsheetData.push(spreadsheetTemp);
				spreadsheetTemp = [];
				exportData.push(exportTemp);
				exportTemp = [];
			}
		}
	}

	/* Calculate width for spreadsheet based on number of jobs
	 * and whether or not justifications are being displayed. */
	var spreadsheetWidth = 150 + (175 * keys.length);
	if (justifications)
		spreadsheetWidth += 250 * keys.length;

	return [spreadsheetData, exportData, spreadsheetWidth];
}


/* The job history page displays a table of all previously completed jobs, sorted chronologically.
 * Allows the user to look at the results of/delete one or more jobs. */
class JobHistory extends Component {
	static propTypes = {
		cookies: instanceOf(Cookies).isRequired
	};


	constructor(props) {
		super(props);

		this._isMounted = false;

		/* Get column checkbox values from cookies (if they exist, otherwise use defaults). */
		const { cookies } = props;

		var defaultCols = ["jobID", "jobTime", "jobName"];
		var defaultGeneral = ["jobID", "jobTime", "jobName"];
		var defaultInput = [];
		var defaultResult = [];

		if (typeof cookies.get('defaultCols') !== 'undefined')
			defaultCols = cookies.get('defaultCols');
		if (typeof cookies.get('defaultGeneral') !== 'undefined')
			defaultGeneral = cookies.get('defaultGeneral');
		if (typeof cookies.get('defaultInput') !== 'undefined')
			defaultInput = cookies.get('defaultInput');
		if (typeof cookies.get('defaultResult') !== 'undefined')
			defaultResult = cookies.get('defaultResult');

		/* Initialize state variables:
		 *   - 'jobHistory'              :  a list containing the entirety of the job history database. Empty before fetch.
		 *   - 'tableData'               :  a list containing the data shown in the table. Empty by default.
		 *   - 'selectedRowKeys'         :  a list containing all the rowIDs of all of the currently selected rows in the table. Empty by default.
		 *   - 'selectedRowKeysHolder'   :  a list for holding the currently-selected rowKeys. Fixes empty-datasheet glitch. Empty by default.
		 *   - 'currentJobID'            :  the ID of the currently-selected job. Used for setting modal title with job ID, only on a single job.
		 *   - 'justifications'          :  flag to toggle visibility of justifications in the spreadsheet modal. True by default.
		 *   - 'spreadsheetModalVisible' :  flag to toggle visibility of the modal containing the datasheet. False by default.
		 *   - 'spreadsheetModal'        :  object that holds the content of the spreadsheet modal. Null be default.
		 *   - 'columnModalVisible'      :  flag to toggle visibility of the modal containing the column picker. False by default.
		 *   - 'columnModal'             :  object that holds the content of the column picker modal. null be default
		 *   - 'tableColumns'            :  a list containing the column definitions for the table. Empty be default.
		 *   - 'selectedColumns'         :  a list containing the columns that are currently active. Default to defaultCols list.
		 *   - 'generalCheckboxes'       :  a list containing the general columns that are active. GENERAL COLUMNS SHOULD ALWAYS BE ACTIVE.
		 *   - 'inputCheckboxes'         :  a list containing the checkboxes for the 'input' section of the table data.
		 *   - 'resultCheckboxes'        :  a list containing the checkboxes for the 'result' section of the table data.
		 *   - 'error'                   :  flag to determine if there has been a general error. If true, prevents page from rendering.
		 *   - 'windowWidth'             :  window width obtained from window listener. Inherited from App.js.
		 *   - 'windowHeight'            :  window height obtained from window listener. Inherited from App.js.
		 */
		this.state = {
			jobHistory: [],
			tableData: [],
			selectedRowKeys: [],
			selectedRowKeysHolder: [],
			currentJobID: -1,
			justifications: true,
			spreadsheetModalVisible: false,
			spreadsheetModal: null,
			columnModalVisible: false,
			columnModal: null,
			tableColumns: [],
			selectedColumns: defaultCols,
			generalCheckboxes: defaultGeneral,
			inputCheckboxes: defaultInput,
			resultCheckboxes: defaultResult,
			error: null,
			windowWidth: 1000,
			windowHeight: 1000,
			IDs: null,
			res: false
		};

		/* Checking if it should display result immediately */
		try{
			this.state.IDs = window.location.href.split('?IDs=')[1].split(',').map(function (v) {
				return parseInt(v, 10);
			});
	
			/* Get URL of the page, snip the '?justifications=' section to get 'true' or 'false'. */
			this.state.res = window.location.href.split('?res=')[1].split('?IDs=')[0];
			this.state.res = (this.state.res === 'true');
		} catch (err){
			this.state.res = false;
		}

	}

	/* Called immediately after the constructor. Allows page to render with empty values before data is added to avoid a crash. */
	componentDidMount = async () => {
		this.refreshAfterComponentMount();
		this._isMounted = true;
	}

	componentWillUnmount = async () => {
		this._isMounted = false;
	 }

	/* Called when the window is resized. Gets window dimensions passed from App.js. */
	componentDidUpdate(prevProps) {
		/* If the window height/width passed from App.js is different than
		 * the value stored in the state, update the state with the new value. */
		if (prevProps.windowWidth !== this.props.windowWidth || prevProps.windowHeight !== this.props.windowHeight) {
			this.setState({
				windowWidth: this.props.windowWidth,
				windowHeight: this.props.windowHeight
			});

			this.refreshTable();
		}
	}

	/* Grabs the job history from the endpoint and rebuilds the table. */
	refreshTable = async () => {
		/* Fetch the job history from the server. Wait unfil fetch is complete to continue. */
		await this.fetchHistory();

		/* If there was an error fetching the paper database, don't attempt to populate dropdowns/radios. */
		if (this.state.error !== true && this.state.error !== null) {
			await this.buildTableColumns();
			await this.buildTable();
		}

	}

	/* Grabs the job history from the endpoint and rebuilds the table after ComponentDidMount */
	refreshAfterComponentMount = async () => {
		/* Fetch the job history from the server. Wait unfil fetch is complete to continue. */
		await this.fetchHistory();

		/* If there was an error fetching the paper database, don't attempt to populate dropdowns/radios. */
		if (this.state.error !== true && this.state.error !== null) {
			await this.buildTableColumns();
			await this.buildTable();
		}

		/* Double check if it is mounted, and if result needs to be displayed */
		if (this._isMounted){
			if (this.state.res == true && this._isMounted == true){
				setTimeout(() => {
					this.setState({ selectedRowKeys: [(this.state.IDs).toString()], justifications: true });
					this.compareJobs(this.state.selectedRowKeys);
				}, 300);
			}
		}

	}

	/* Calls the database to request job history. */
	fetchHistory = async () => {
		await fetch(appConfig.sjaApiUrl + "history", {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
			}
		}).then(async (res) => {
			await res.json().then((data) => {
				/* Save the fetched data to the jobHistory state list,
				 * set error flag to false to indicate successful fetch. */
				let jobs = [data.history];
				
				var n = []
				for (const [id, j] of Object.entries(jobs[0])){
					let id2 = {[id]:j};
					n.push(id2);	
				}
				
				this.setState({
					jobHistory: n,
					error: false
				});
			});
		}).catch(err => {
			/* If there was an error in the fetch, call fetchError() to alert the user. */
			this.fetchError("fetch job history");
		});
		
	}

	/* Deletes currently selected jobs from the Job History file. */
	deleteHistory = async (keys) => {
		await fetch(appConfig.sjaApiUrl + "history/" + keys, {
			method: 'DELETE',
			headers: {
				'Accept': 'application/json',
			}
		}).then(async (res) => {
			await res.json().then((data) => {
				/* Print message from server, deselect all selected rows, rebuild the table. */
				this.setState({ selectedRowKeys: [] })
				this.refreshTable();
			});
		}).catch(err => {
			/* If there was an error in the fetch, call fetchError() to alert the user. */
			this.fetchError("delete from job history");
		});
	}

	/* Called when there is an error in a fetch call. */
	fetchError = (type) => {
		this.alertPresent = false;

		/* This is for debouncing, so the alert doesn't appear twice. */
		if (!this.alertPresent) {
			this.alertPresent = true;

			notification['error']({
				message: <Translator
							to={this.props.LOCALE}
							from='en'
							googleApiKey={appConfig.googleApiKey}>
								<Translate>Failed to </Translate><Translate>{type}</Translate>.
							</Translator>,
				description: <Translator
								to={this.props.LOCALE}
								from='en'
								googleApiKey={appConfig.googleApiKey}> 
									<Translate>The server is probably down. Try again later.</Translate> 
								</Translator>,
				duration: 3
			});

			/* Debouncing... */
			setTimeout(() => {
				this.alertPresent = false;
			}, 1000);
		}

		/* Toggle the error state flag. */
		this.setState({ error: true });
	}

	/* Creates the contents for the column picker modal. */
	buildColumnChecklist = () => {
		/* Build the contents of the column select modal. */
		var colList1 = [
			{ label: "Job ID", value: "jobID", disabled: true },
			{ label: "Date", value: "jobTime", disabled: true },
			{ label: "Job Name", value: "jobName", disabled: true },
		];
		var colList2 = [];
		var colList3 = [];

		/* Build the list of input values. */
		var [key] = Object.entries(this.state.jobHistory[0]);
		for (let i = 0; i < Object.keys(key[1].inputProperties).length; i++) {
			/* Get the label for the column, clean it up a bit. */
			var tempTitle = Object.keys(key[1].inputProperties)[i];
			tempTitle = tempTitle.replace(/([a-z])([A-Z])/g, '$1 $2');
			tempTitle = tempTitle.charAt(0).toUpperCase() + tempTitle.slice(1);

			/* Add it to the list of column labels. */
				colList2.push(
					{
						label: tempTitle,
						value: Object.keys(key[1].inputProperties)[i]
					},
				);
		}

		/* Build the list of result values. */
		for (let j = 0; j < Object.keys(key[1].calculatedProperties).length; j++) {
			/* Get the label for the column, clean it up a bit. */
			var tempTitle2 = Object.keys(key[1].calculatedProperties)[j];
			tempTitle2 = tempTitle2.replace(/([a-z])([A-Z])/g, '$1 $2');
			tempTitle2 = tempTitle2.charAt(0).toUpperCase() + tempTitle2.slice(1);

			/* Add it to the list of column labels. */
				colList3.push(
					{
						label: tempTitle2,
						value: Object.keys(key[1].calculatedProperties)[j]
					},
				);
		}

		/* If window width is small, do 2 per row instead of 3 (helps with formatting). */
		var colSpan = 8;

		if (this.state.windowWidth <= 500)
			colSpan = 12;

		/* Build checkbox lists for each section. Helps with formatting. */
		var alwaysActiveCols = this.buildCheckboxes(colList1, 'general', colSpan, true);
		var jobInputCols = this.buildCheckboxes(colList2, 'input', colSpan);
		var jobResultCols = this.buildCheckboxes(colList3, 'result', colSpan);

		/* Build the content within the modal using the objects that were just created. */
		var modalInnards =
			<>
				<b>Always-Active Columns</b><br />
				<Translate>{alwaysActiveCols}</Translate>
				<br /><br />

				<b>Job Input Columns</b>
				<Translate>{jobInputCols}</Translate>
				<br /><br />

				<b>Job Result Columns</b>
				<Translate>{jobResultCols}</Translate>
			</>;

		/* Set the columnModal state object equal to the modal content that was just created. */
		this.setState({
			columnModal: modalInnards
		});
	}

	/* Helper function to generate checkbox grids from a list of strings. */
	buildCheckboxes = (list, type, span, disabled = false) => {
		return (
			<Checkbox.Group style={{ width: '100%' }} defaultValue={this.state.selectedColumns} onChange={(vals) => { this.onCheckboxChange(vals, type) }}>
				<Row>
					{
						list.map((item) => {
							return (
								<Col key={item.label} span={span}>
									<Checkbox disabled={disabled} value={item.value}>{item.label}</Checkbox>
								</Col>
							);
						})
					}
				</Row>
			</Checkbox.Group>
		);
	}

	/* Holds values in each checkbox, updates immediately when a checkbox is clicked.
	 * Stores values temporarily before they are committed over to the selectedColumns state array. */
	onCheckboxChange = (checkedValues, type) => {
		switch (type) {
			case 'input':
				this.setState({ inputCheckboxes: checkedValues });
				break;
			default:
				this.setState({ resultCheckboxes: checkedValues });
				break;
		}
	}

	/* When the columnChange modal 'Ok' button is clicked, transfer all checkbox arrays
	 * to the selectedColumns array, then rebuild the table with the new column list. */
	columnChangeConfirm = () => {
		const {
			generalCheckboxes,
			inputCheckboxes,
			resultCheckboxes
		} = this.state;

		var temp = [];

		/* Collect all checkbox values, concat into one array. */
		temp = temp.concat(generalCheckboxes);
		temp = temp.concat(inputCheckboxes);
		temp = temp.concat(resultCheckboxes);

		/* Initialize cookies and set them to remember checkbox selection */
		const { cookies } = this.props;

		cookies.set('defaultCols', temp, { path: '/', maxAge: 31536000 });
		cookies.set('defaultGeneral', generalCheckboxes, { path: '/', maxAge: 31536000 });
		cookies.set('defaultInput', inputCheckboxes, { path: '/', maxAge: 31536000 });
		cookies.set('defaultResult', resultCheckboxes, { path: '/', maxAge: 31536000 });

		/* Set selected columns, rebuild table. */
		this.setState({
			selectedColumns: temp,
			columnModalVisible: false
		}, () => {
			this.buildTableColumns();
			this.buildTable();
		});
	}

	/* Builds the column structure of the table based on what columns have been selected. */
	buildTableColumns = () => {
		const { selectedColumns, jobHistory, windowWidth } = this.state;

		var tempCol = [];
		var tempWidth = 850;

		/* Add base columns that cannot be removed. */
		tempCol.push(
			{
				title: <Translate>Job ID</Translate>,
				dataIndex: 'jobID',
				width: 100,
				sorter: (a, b) => a.jobID - b.jobID,
				fixed: windowWidth <= 500 ? false : 'left'
			},
			{
				title: <Translate>Date</Translate>,
				dataIndex: 'jobTime',
				width: 275,
				sorter: (a, b) => moment(a.jobTime).unix() - moment(b.jobTime).unix(),
			},
			{
				title: <Translate>Job Name</Translate>,
				dataIndex: 'jobName',
				ellipsis: true,
				sorter: (a, b) => { return a.jobName.localeCompare(b.jobName) },
			},
		);

		/* Add the rest of the selected columns. */
		for (let i = 0; i < selectedColumns.length; i++) {
			var [key] = Object.entries(jobHistory[0]);
			if (selectedColumns[i] !== 'jobID' && selectedColumns[i] !== 'jobTime' && selectedColumns[i] !== 'jobName' && selectedColumns[i] !== 'result') {
				var tempTitle = selectedColumns[i].replace(/([a-z])([A-Z])/g, '$1 $2');
				tempTitle = tempTitle.charAt(0).toUpperCase() + tempTitle.slice(1);

				/* Check if value is number, boolean, or string. If number sort rows by number, if string sort rows by localecompare. */
				for (let j = 0; j < Object.keys(key[1].inputProperties).length; j++) {
					if ( selectedColumns[i] == Object.entries(key[1].inputProperties)[j][0]) {
						if ((typeof (Object.entries(key[1].inputProperties)[j][1]) === 'number'))
							tempCol.push(
								{
									title: <Translate>{tempTitle}</Translate>,
									dataIndex: selectedColumns[i],
									width: 175,
									sorter: (a, b) => a[selectedColumns[i]] - b[selectedColumns[i]],
								},
							);
						else if ((typeof (Object.entries(key[1].inputProperties)[j][1]) === 'boolean'))
							tempCol.push(
								{
									title: <Translate>{tempTitle}</Translate>,
									dataIndex: selectedColumns[i],
									width: 175,
									sorter: (a, b) => { return a[selectedColumns[i]].toString().localeCompare(b[selectedColumns[i]].toString()) },
									render: (text) => { return text.toString() }
								},
							);
						else
							tempCol.push(
								{
									title: <Translate>{tempTitle}</Translate>,
									dataIndex: selectedColumns[i],
									width: 175,
									sorter: (a, b) => { return a[selectedColumns[i]].localeCompare(b[selectedColumns[i]]) },
								},
							);
					}
				}
				for (let j = 0; j < Object.keys(key[1].calculatedProperties).length; j++) {
					if ( selectedColumns[i] == Object.entries(key[1].calculatedProperties)[j][0]) {
						if ((typeof (Object.entries(key[1].calculatedProperties)[j][1]) === 'number'))
							tempCol.push(
								{
									title: <Translate>{tempTitle}</Translate>,
									dataIndex: selectedColumns[i],
									width: 175,
									sorter: (a, b) => a[selectedColumns[i]] - b[selectedColumns[i]],
								},
							);
						else if ((typeof (Object.entries(key[1].calculatedProperties)[j][1]) === 'boolean'))
							tempCol.push(
								{
									title: <Translate>{tempTitle}</Translate>,
									dataIndex: selectedColumns[i],
									width: 175,
									sorter: (a, b) => { return a[selectedColumns[i]].toString().localeCompare(b[selectedColumns[i]].toString()) },
									render: (text) => { return text.toString() }
								},
							);
						else
							tempCol.push(
								{
									title: <Translate>{tempTitle}</Translate>,
									dataIndex: selectedColumns[i],
									width: 175,
									sorter: (a, b) => { return a[selectedColumns[i]].localeCompare(b[selectedColumns[i]]) },
								},
							);
					}
				}

				tempWidth += 175;
			}
		}


		/* Add results columns that cannot be removed. */
		tempCol.push(
			{
				title: <Translate>View</Translate>,
				render: (text, row) =>
					<Button
						className={windowWidth <= 500 ? null : Style.resultsColumn}
						onClick={() => {
							setTimeout(() => {
								this.setState({ selectedRowKeys: [row.jobID], justifications: true });
								this.compareJobs([row.jobID]);
							}, 100);
						}}
					>
					<Icon className={Style.buttonIcon} type="search" /></Button>,
				width: 65,
				fixed: 'right'
			},
		);

		/* Save generated columns/width to state objects. */
		this.setState({
			tableColumns: tempCol,
			tableWidth: tempWidth
		});
	}

	/* Build the table rows depending on what checkboxes are selected. */
	buildTable = () => {
		const { jobHistory, selectedColumns } = this.state;

		var tableArray = [];
		var rowObject = {};

		/* Create an entry in the table for each object in jobHistory. */
		for (let i = Object.keys(jobHistory).length - 1; i >= 0; i--) {
			var [key] = Object.entries(jobHistory[i]);

			/* Add data from correct spot. Column data may be surface level, or child of 'input'/'result' */
			for (let j = 0; j < selectedColumns.length; j++) {
				if (j == 0)
					rowObject[selectedColumns[j]] = key[0];
				else if (j == 1)
					rowObject[selectedColumns[j]] = key[1].dateTime;
				else if (j == 2)
					rowObject[selectedColumns[j]] = key[1].jobName;
				else{
					for (let k = 0; k < Object.keys(key[1].inputProperties).length; k++) {
						if ( selectedColumns[j] == Object.entries(key[1].inputProperties)[k][0] ) {
							if (typeof Object.entries(key[1].inputProperties)[k][1] !== 'undefined')
								rowObject[selectedColumns[j]] = Object.entries(key[1].inputProperties)[k][1];
						}
					}
					for (let j = 0; j < Object.keys(key[1].calculatedProperties).length; j++) {
						if ( selectedColumns[i] == Object.entries(key[1].calculatedProperties)[j][0]) {
							if (typeof Object.entries(key[1].calculatedProperties)[j][1] !== 'undefined')
								rowObject[selectedColumns[j]] = Object.entries(key[1].calculatedProperties)[j][1];
						}
					}
				}
			}

			/* Add the row to the table data array, clear the row object for next run. */
			
			tableArray.push(rowObject);
			rowObject = {};
		}

		/* Save generated table rows to state so they can be used by the table. */
		this.setState({ tableData: tableArray })
	}

	/* Called when ticking a checkbox to select a row. */
	onSelectChange = selectedRowKeys => {
		this.setState({ selectedRowKeys });
	}

	/* Toggles the visibility of the job results modal. */
	toggleModal = (type) => {
		if (type === "spreadsheet")
			this.setState({
				spreadsheetModalVisible: !this.state.spreadsheetModalVisible
			});
		else if (type === "columns")
			this.setState({
				columnModalVisible: !this.state.columnModalVisible
			});
	}

	/* Constructs the content of the modal. */
	compareJobs = (keys) => {
		var { justifications } = this.state;

		/* Get the data from the row in the table, organize it. */
		var spreadExportData = [];
		spreadExportData = BuildSpreadsheet(keys, this.state.jobHistory, justifications, this.props.LOCALE);

		var spreadsheetData = spreadExportData[0];
		var exportData = spreadExportData[1];
		var spreadsheetWidth = spreadExportData[2];

		/* Build the name of the file generated when the "Export to CSV" button is clicked.
		 * Also build the target URL for the 'Copy Link to Clipboard' button.*/
		var copyURL = window.location.href;

		var fileName = "";
		if (keys.length === 1)
			fileName = "Job";
		else
			fileName = "Compare_Jobs";

		for (let i = 0; i < keys.length; i++) {

			fileName += "_" + keys[i];
		}

		fileName += ".csv";

		/* Build the ReactDataSheet component using the data returned from buildSpreadsheet(). */
		var modalInnards =
			<>
				<CSVLink data={exportData} filename={fileName}>
					<Button
						type="primary"
						style={{ marginBottom: 10, marginRight: 10, paddingLeft: 10, paddingRight: 10 }}
					>
						<Icon className={Style.buttonIcon} type="file-excel" />
						<Translator
							to={this.props.LOCALE}
							from='en'
							googleApiKey={appConfig.googleApiKey}><Translate>Export to CSV</Translate></Translator>
					</Button>
				</CSVLink>
				<CopyToClipboard text={copyURL}>
					<Tooltip placement="top" trigger="focus" title="Copied!">
						<Button
							type="default"
							style={{ marginBottom: 10, paddingLeft: 10, paddingRight: 10 }}
						>
							<Icon className={Style.buttonIcon} type="copy" />
							<Translator
							to={this.props.LOCALE}
							from='en'
							googleApiKey={appConfig.googleApiKey}><Translate>Copy Link to Clipboard</Translate></Translator>
						</Button>
					</Tooltip>
				</CopyToClipboard>
				<Checkbox
					style={{ marginLeft: spreadsheetWidth > 350 ? 10 : 0, marginBottom: 10 }}
					onChange={() => this.handleJustifications()}
					checked={justifications}
				>
					<Translator
							to={this.props.LOCALE}
							from='en'
							googleApiKey={appConfig.googleApiKey}><Translate>Justifications?</Translate></Translator>
				</Checkbox>
				<div style={{ width: '100%', overflowX: 'scroll' }}>
					<div style={{ width: spreadsheetWidth }}>
						<ReactDataSheet
							data={spreadsheetData}
							valueRenderer={(cell) => { cell.readOnly = true; return <div style={{ textAlign: 'center' }}>{cell.value}</div>} }
						/>
					</div>
				</div>
			</>;

			this.setState({
				selectedRowKeysHolder: keys,
				spreadsheetWidth: spreadExportData[2],
				spreadsheetModal: modalInnards,
				currentJobID: keys.length === 1 ? keys[0] : null
			})

		/* Open the modal and display the data. */
		this.toggleModal("spreadsheet");
	}

	/* Triggered when checkbox is clicked. Toggles justification column. */
	handleJustifications = async () => {
		/* Close the spreadsheet modal. */
		this.toggleModal("spreadsheet");

		/* Toggle justifications. Wait for this to finish. */
		await this.setState({ justifications: !this.state.justifications });

		/* After a 300ms delay, rebuild and reopen the spreadsheet modal. */
		setTimeout(() => { this.compareJobs(this.state.selectedRowKeysHolder); this.forceUpdate(); }, 300);
	}

	render() {
		const {
			tableData,
			tableColumns,
			tableWidth,
			spreadsheetWidth,
			spreadsheetModal,
			spreadsheetModalVisible,
			columnModal,
			columnModalVisible,
			selectedRowKeys,
			windowWidth,
		} = this.state;

		let { LOCALE } = this.props;


		/* Some options for the rowselection column in the table. */
		let rowSelection = {
			selectedRowKeys,
			onChange: this.onSelectChange,
			fixed: 'left',
		};

		return (
			<Translator
      			to={LOCALE}
      			from='en'
      			googleApiKey={appConfig.googleApiKey}>

			<Fragment>
				<h1><Translate>Job History</Translate></h1>

				{/* Button for column configuration. Separate from the others. */}
				<Button
					className={Style.settingsButton}
					onClick={() => {
						this.buildColumnChecklist();
						this.toggleModal("columns");
					}}
					type="default"
				>
					<Icon className={Style.buttonIcon} type="setting" />
					<Translate> Columns </Translate>
				</Button>

				<br />

				{/* Modal for job results/comparison spreadsheet. */}
				<Modal
					title={selectedRowKeys.length === 1 ?
						"Job " + this.state.currentJobID + " Results"
						:
						"Job Comparison"
					}
					visible={spreadsheetModalVisible}
					onCancel={() => {
						this.toggleModal("spreadsheet");
						this.setState({
							selectedRowKeys: [],
							currentJobID: -1,
							justifications: false,
						});
						history.replaceState(window.location.href, '', '/job-history');
					}}
					destroyOnClose={true}
					footer={null}
					width={spreadsheetWidth + 20}
					style={{ maxWidth: '95%' }}
					bodyStyle={{ padding: '10px' }}
				>
					{spreadsheetModal}
				</Modal>

				{/* Modal for choosing active column in the jobHistory table. */}
				<Modal
					title={<Translate>Select Visible Columns</Translate>}
					visible={columnModalVisible}
					onOk={this.columnChangeConfirm}
					onCancel={() => {
						this.toggleModal("columns");
					}}
					destroyOnClose={true}
					width={450}
				>
					{columnModal}
				</Modal>

				{/* Only render the clear button and row selection indication when rows are selected. */}
				<div className={Style.tableHeader}>
					{selectedRowKeys.length > 1 ?
						<Button
							className={Style.tableButton}
							onClick={() => {
								this.setState({ justifications: false }, () => this.compareJobs(selectedRowKeys));
							}}
							type="primary"
						>
							<Icon className={Style.buttonIcon} type="diff" />
							<Translate>Compare</Translate>
						</Button>
						:
						null

					}
					{selectedRowKeys.length > 0 ?
						<>
							<Button
								className={Style.tableButton}
								onClick={() => this.setState({ selectedRowKeys: [] })}
								type="default"
							>
								<Icon className={Style.buttonIcon} type="undo" />
								<Translate>Deselect</Translate>
							</Button>
							<Popconfirm
								title="Are you sure you want to delete the job(s)?"
								onConfirm={() => this.deleteHistory(selectedRowKeys)}
							>
								<Button className={Style.tableButton} type="danger" >
									<Icon className={Style.buttonIcon} type="delete" />
									<Translate>Delete</Translate>
								</Button>
							</Popconfirm>
							<span>{selectedRowKeys.length} selected</span>
						</>
						:
						<br />
					}
				</div>

				<Table
					rowKey="jobID"
					rowSelection={rowSelection}
					dataSource={tableData}
					columns={tableColumns}
					style={{ width: tableWidth, maxWidth: '100%' }}
					scroll={{ y: '60vh', x: tableWidth - 100 }}
					pagination={{ defaultPageSize: 10, showQuickJumper: true, showSizeChanger: true, pageSizeOptions: ['10', '20', '30'] }}
					size={windowWidth <= 500 ? "small" : "large"}
					bordered
					onRow={(record, rowIndex) => {
						/* Allows rows to be selected by clicking on them,
						 * instead of having to click the rowselection checkbox. */
						return {
							onClick: () => {
								var tempRowKeys = [...this.state.selectedRowKeys];

								if (tempRowKeys.indexOf(record.jobID) === -1)
									tempRowKeys.push(record.jobID)
								else
									tempRowKeys.splice(tempRowKeys.indexOf(record.jobID), 1);

								this.setState({ selectedRowKeys: tempRowKeys });
								this.forceUpdate();
							}
						}
					}}
				/>
			</Fragment>
			</Translator>
		);
	}
}

export default withCookies(JobHistory);