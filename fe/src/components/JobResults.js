import React, { Component, Fragment } from 'react';
import { Button, Checkbox, notification, Spin, Tooltip, Icon } from 'antd';

import { CopyToClipboard } from 'react-copy-to-clipboard';
import { CSVLink } from "react-csv";
import { Navigate } from 'react-router';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import ReactDataSheet from "react-datasheet";
import 'react-datasheet/lib/react-datasheet.css';

import { BuildSpreadsheet } from './JobHistory.js';
import Style from '../css/JobHistory.module.css'
import { Translator, Translate } from 'react-auto-translate';


const appConfig = require('../config.json');

/* This class handles displaying the results of job(s) to the user.
 * In the URL, there are two options:
 *   - '?justifications=[true|false]' : toggles justifications, on by default
 *   - '?IDs=[IDs]'                   : list of jobs to display
 */
export class JobResults extends Component {
	constructor(props) {
		super(props);

		/* Get the URL of the page, snip off everything after '?IDs=',
		 * take remaining string and split on ',' into an array. */
		var IDs = window.location.href.split('?IDs=')[1].split(',').map(function (v) {
			return parseInt(v, 10);
		});

		/* Get URL of the page, snip the '?justifications=' section to get 'true' or 'false'. */
		var justifications = window.location.href.split('?justifications=')[1].split('?IDs=')[0];
		justifications = (justifications === 'true');

		/* Initialize state variables:
		 *   - 'jobIDs'           :  a list containing all of the Job IDs passed through the URL.
		 *   - 'jobResults'       :  a list containing the job data fetched from the server.
		 *   - 'justifications'   :  flag to determine whether or not to show justifications in the spreadsheet. On by default.
		 *   - 'spreadsheetData'  :  object that holds generated spreadsheet data. Null initially.
		 *   - 'exportData'       :  object that holds generated export data. Null initially.
		 *   - 'spreadsheetWidth' :  the width of the spreadsheet, calculated base on the number of jobs and if justifications are toggled.
		 *   - 'showSpreadsheet'  :  flag to determine whether or not to render the spreadsheet. When false, spreadsheet is destroyed so it can be rebuilt.
		 *   - 'copyURL'          :  the URL copied when the 'Copy Link to Clipboard' button is pressed.
		 *   - 'fileName'         :  the name of the file created when the 'Export to CSV' button is pressed.
		 *   - 'ready'            :  flag that indicates data is ready to be displayed. When true, spinner will be replaced with rendered page.
		 *   - 'error'            :  flag that indicates an error has been hit. When true, page will not load/operate on nonexisting data.
		 *   - 'windowWidth'      :  window width obtained from window listener. Inherited from App.js.
		 *   - 'windowHeight'     :  window height obtained from window listener. Inherited from App.js.
		 */
		this.state = {
			jobIDs: IDs,
			jobResults: [],
			justifications: justifications,
			spreadsheetData: null,
			exportData: null,
			spreadsheetWidth: 0,
			showSpreadsheet: false,
			copyURL: "",
			fileName: "",
			ready: false,
			error: false,
			windowWidth: 1000,
			windowHeight: 1000,
		};
	}

	/* Calls after the component mounts. Fetches data and generates spreadsheet/export. */
	componentDidMount = async () => {
		const { jobIDs } = this.state;

		/* Fetch each job in a row, saving the fetched data to the jobResults state list. */
		for (let i = 0; i < jobIDs.length; i++)
			await this.fetchJob(jobIDs[i]);

		/* After all data has been fetched, generate the spreadsheet. */
		this.generateSpreadsheet();
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
		}
	}

	/* Calls the database to request job history. */
	fetchJob = async (id) => {
		await fetch(appConfig.sjaApiUrl + "job-history/" + id, {
			method: "GET",
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
			}
		}).then(async (res) => {
			await res.json().then((data) => {
				console.log("data: ", data);
				/* Make a copy of the jobResults state list, append newly-fetched data. */
				var temp = [...this.state.jobResults];
				temp.push(data);
				console.log("temp: ", temp);
				/* Save jobResults copy back to the state. */
				this.setState({
					jobResults: temp
				});
			});
		}).catch(err => {
			/* If there was an error in the fetch, call fetchError() to alert the user. */
			this.fetchError("fetch job history");
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

	/* Generate the data for the spreadsheet/export. */
	generateSpreadsheet = () => {
		console.log("generateSpreadsheet");
		const { jobIDs, jobResults, justifications } = this.state;
		console.log("jobIDs: ", jobIDs);
		console.log("jobResults: ", jobResults);

		/* Only continue if there hasn't been an error of some kind. */
		if (!this.state.error) {
			/* Generate URL copied when 'Copy Link to Clipboard' button is pressed. */
			var copyURL = window.location.href.split('job-results')[0];
			if (justifications)
				copyURL += 'job-results?justifications=true?IDs='
			else
				copyURL += 'job-results?justifications=false?IDs='

			/* Append job IDs to the copy URL. */
			copyURL += window.location.href.split('?IDs=')[1];

			/* Call the function from JobHistory that builds the spreadsheet and export data. */
			console.log("about to navigate");
			//const navigate = useNavigate();
			return <Navigate push to="/job-history" />;
			console.log("calling BuildSpreadsheet");
			var data = BuildSpreadsheet(jobIDs, jobResults, justifications);

			/* Name of the file generated when the "Export to CSV" button is clicked. */
			var fileName = "";
			if (jobIDs.length === 1)
				fileName = "Job";
			else
				fileName = "Compare_Jobs";

			for (let i = 0; i < jobIDs.length; i++)
				fileName += "_" + jobIDs[i];

			fileName += ".csv";

			/* Save the spreadsheet/export data to the state, along with the generated spreadsheet width.
			 * Also save copyURL and fileName, then toggle the showSpreadsheet and ready flags. */
			this.setState({
				spreadsheetData: data[0],
				exportData: data[1],
				spreadsheetWidth: data[2],
				showSpreadsheet: true,
				copyURL: copyURL,
				fileName: fileName,
				ready: true,
			});
		}
	}

	/* Triggered when checkbox is clicked. Toggles justification column. */
	handleJustifications = async () => {
		/* Set showSpreadsheet flag to false, derendering the spreadsheet
		 * and destroying its contents so that justifications can be toggled. */
		await this.setState({
			showSpreadsheet: false,
			justifications: !this.state.justifications
		});

		/* Once the justifications have been toggled, rebuild the spreadsheet/export data. */
		await this.generateSpreadsheet();
	}

	render() {
		console.log("JobResults");
		const {
			ready,
			jobIDs,
			justifications,
			copyURL,
			fileName,
			spreadsheetData,
			showSpreadsheet,
			spreadsheetWidth,
			exportData
		} = this.state;

		/* If content has not yet loaded, show a spinner in the middle of the screen. */
		if (!ready)
			return (
				<div style={{ textAlign: 'center', width: '100%', height: '90%' }}>
					<div style={{ position: 'relative', top: '50%' }} >
						<Spin size="large" style={{ position: 'relative' }} />
					</div>
				</div>
			);
		else
			return (
				<Translator
      			to={this.state.LOCALE}
      			from='en'
      			googleApiKey={appConfig.googleApiKey}>

				<Fragment>
					{jobIDs.length < 2 ?
						<h1>Job {jobIDs} Results</h1>
						:
						<h1><Translate>Job Comparison</Translate></h1>
					}
					<br /><br />

					{/* Buttons for exporting to CSV, copying link to clipboard,
					  * checkbox for toggling justifications in the spreadsheet/export. */}
					<CSVLink data={exportData} filename={fileName}>
						<Button type="primary" style={{ marginBottom: 10, marginRight: 10, paddingLeft: 10, paddingRight: 10 }}>
							<Icon className={Style.buttonIcon} type="file-excel" />
							<Translate>Export to CSV</Translate>
						</Button>
					</CSVLink>
					<CopyToClipboard text={copyURL}>
						<Tooltip placement="top" trigger="click" title="Copied!">
							<Button
								type="default"
								style={{ marginBottom: 10, paddingLeft: 10, paddingRight: 10 }}
							>
								<Icon className={Style.buttonIcon} type="copy" />
								<Translate>Copy Link to Clipboard</Translate>
						</Button>
						</Tooltip>
					</CopyToClipboard>
					<Checkbox
						style={{ marginLeft: 16, marginBottom: 10 }}
						onChange={() => this.handleJustifications()}
						checked={justifications}
					>
						<Translate>Justifications?</Translate>
					</Checkbox>

					{/* Conditional rendering of the spreadsheet.
					  * If showSpreadsheet is true, then the ReactDataSheet component is rendered.
					  * If showSpreadsheet is false, null is rendered (ReactDataSheet is destroyed). */}
					{showSpreadsheet ?
						<div style={{ width: spreadsheetWidth, maxWidth: '100%', overflowX: 'scroll' }}>
							<div style={{ width: spreadsheetWidth }}>
								<ReactDataSheet
									data={spreadsheetData}
									valueRenderer={(cell) => <div style={{ textAlign: 'center' }}>{cell.value}</div>}
									onChange={() => { }}
								/>
							</div>
						</div>
						:
						null
					}
				</Fragment>
				</Translator>
			);
	}
}