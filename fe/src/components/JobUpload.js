﻿import React, { Component, Fragment } from 'react';
import { Navigate } from 'react-router';
import { Link } from "react-router-dom";
import { Row, Col, Spin } from 'antd';
import { Translator, Translate } from 'react-auto-translate';


const appConfig = require('../config.json');

/* Handles uploading PDF files, including analyzing them for maxCoverage. */
export class JobUpload extends Component {
	constructor(props) {
		super(props);

		/* Build a list to hold PDF processing status: 0 means still working, 1 means done.
		 * Build an additional list to hold coverage values for each file. */
		let fileStatus = Array.from(Array(this.props.fileList.length), (_, i) => 0);
		let fileCoverage = Array.from(Array(this.props.fileList.length), (_, i) => 0);
		let jobIDs = Array.from(Array(this.props.fileList.length), (_, i) => 0);
		let fileKbuildup = Array.from(Array(this.props.fileList.length), (_, i) => 0);
		let fileTransfer = Array.from(Array(this.props.fileList.length), (_, i) => 0);
		let fileStreaking = Array.from(Array(this.props.fileList.length), (_, i) => 0);
		let fileWrinkleCurl = Array.from(Array(this.props.fileList.length), (_, i) => 0);
		let fileGhosting = Array.from(Array(this.props.fileList.length), (_, i) => 0);
		let fileFlaking = Array.from(Array(this.props.fileList.length), (_, i) => 0);

		/* Trigger that must be active in addition to the uploadReady flag. Used for debouncing. */
		this.trigger = true;

		/* Initialize state variables:
		 *   - 'jobIDs'       :  a list that holds all of the IDs of the jobs created.
		 *   - 'modalContent' :  an object that holds the contents of the modal popup.
		 *   - 'fileList'     :  a list of all files that the user has uploaded.
		 *   - 'fileStatus'   :  a list of integer flags, determines the status of the file (analyzing/uploading/done).
		 *   - 'fileCoverage' :  a list containing the calculated coverage values for all PDF files.
		 *   - 'uploadReady'  :  flag for indicating if a file is ready to be uploaded. Used with fileStatus for debouncing.
		 *   - 'complete'     :  flag for indicating if the component is ready to redirect to JobResults.
		 *   - 'idString'     :  string that holds the jobIDs, comma separated.
		 */
		this.state = {
			jobIDs: jobIDs,
			modalContent: null,
			fileList: this.props.fileList,
			fileStatus: fileStatus,
			fileCoverage: fileCoverage,
			fileKbuildup:fileKbuildup,
			fileTransfer:fileTransfer,
			fileStreaking:fileStreaking,
			fileWrinkleCurl:fileWrinkleCurl,
			fileGhosting:fileGhosting,
			fileFlaking:fileFlaking,
			uploadReady: false,
			complete: false,
			idString: "",
		};
	}

	/* Called after the constructor, after the component mounts. */
	componentDidMount = async () => {
		/* Generate the content for the modal */
		await this.buildModalContent();

		/* Send the PDFs to the /analyze-pdf endpoint to get coverage values. */
		// for (let i = 0; i < this.state.fileList.length; i++)
			await this.analyzePDF(0);

		/* Set flag for upload to be ready to fire. */
		this.setState({ uploadReady: true });
	}

	/* Updates the text next to the file name to display the file's current status in processing.
	 * Statuses are:  Analyzing for maxCoverage;  Uploading to new-job;  Done. */
	getFileStatusString = (index) => {
		switch (this.state.fileStatus[index]) {
			case 0:
				return <span><Spin size="small" /><strong>&nbsp;&nbsp;Analyzing...</strong></span>;
			case 1:
				return <span><Spin size="small" /><strong>&nbsp;&nbsp;Uploading...</strong></span>;
			case 2:
				return <span><strong>&#x2713; Done</strong></span>;
			default:
				return <span style={{ color: 'red' }}>ERROR</span>;
		}
	}

	/* Fist function called in componentDidMount().
	 * Generates a grid layout for the statuses and file names in the modal. */
	buildModalContent = () => {
		let { fileList } = this.state;

		/* Generate a row with two columns for each job. */
		let modalContent = fileList.map((item, index) => {
			return (
				<Row key={fileList[index].name} gutter={10}>
					<Col key={fileList[index].name + "1"} span={6}>
						{this.getFileStatusString(index)}
					</Col>
					<Col key={fileList[index].name + "2"} span={18}>
						{fileList[index].name}
					</Col>
				</Row>
			);
		})

		this.setState({ modalContent: modalContent });
	}

	/* Second function called in componentDidMount().
	 * Generates form data and appends file. POSTs the formdata to the /analyze-pdf endpoint.
	 * Saves returned maxCoverage value and sets status flag for job to indicate completion of analysis. */
	analyzePDF = async (index) => {
		const { fileList, fileStatus, fileCoverage, fileFlaking, fileGhosting,
			fileKbuildup, fileStreaking, fileTransfer, fileWrinkleCurl} = this.state;
		var formdata = new FormData();
		formdata.append("pdfFile", fileList[index]);
		await fetch(appConfig.sjaFileApiUrl + '/upload', {
			method: 'POST',
			body: formdata,
			redirect: 'follow'
		}).then(async (res) => {
		await res.json().then(async (data) => {
			var fileToSend = {
				url: appConfig.sjaFileApiUrl+encodeURI(data.path)
			};
			console.log(JSON.stringify(fileToSend))	
			/* POST the file to the /analyze-pdf endpoint, capture returned value. */
			await fetch(appConfig.sjaApiUrl + 'pdf/analyze', {
				method: 'POST',
				body: JSON.stringify(fileToSend), // WILL INSTEAD BE URL
				headers: {
					'Content-Type': 'application/json'
				}
			}).then(async (res) => {
				await res.json().then((data) => {
					console.log(JSON.stringify(data))

					/* Make copies of current state arrays. */
					let tempCoverage = [...fileCoverage];
					let tempFlaking = [...fileFlaking];
					let tempGhosting = [...fileGhosting];
					let tempTransfer = [...fileTransfer];
					let tempKbuildup = [...fileKbuildup];
					let tempWrinkleCurl = [...fileWrinkleCurl];
					let tempStreaking = [...fileStreaking];
					let tempStatus = [...fileStatus];


					/* Capture coverage value and set status tag in copied arrays. */
					tempCoverage[index] = parseFloat(data.metrics.pdfMaxCoverage);
					tempKbuildup[index] = parseFloat(data.metrics.lowKBuild);
					tempTransfer[index] = parseFloat(data.metrics.transferRisk);
					tempStreaking[index] = parseInt(data.metrics.streakingRisk);
					tempWrinkleCurl[index] = parseInt(data.metrics.wcRisk);
					tempGhosting[index] = parseInt(data.metrics.ghostingRisk);
					tempFlaking[index] = parseFloat(data.metrics.flakingRisk);
					tempStatus[index] = 1;

					console.log("tempCoverage", tempCoverage[index])
					console.log("fileKbuildup", tempKbuildup[index])
					console.log("fileTransfer", tempTransfer[index])
					console.log("fileStreaking", tempStreaking[index])
					console.log("fileWrinkleCurl", tempWrinkleCurl[index])
					console.log("fileGhosting", tempGhosting[index])
					console.log("fileFlaking", tempFlaking[index])

					/* Save the changes to the actual state arrays. */
					this.setState({
						fileCoverage: tempCoverage,
						fileKbuildup: tempKbuildup,
						fileTransfer: tempTransfer,
						fileStreaking: tempStreaking,
						fileWrinkleCurl: tempWrinkleCurl,
						fileGhosting: tempGhosting,
						fileFlaking: tempFlaking,
						fileStatus: tempStatus
					});
				});
			}).catch((err) => {
				console.log("ERROR: ", err)
			});
		})
		}).catch((err) => {
		console.log("ERROR: ", err)
		});

		// return
		/* Rebuild modal content to refresh view and update status. */
		this.buildModalContent();
	}

	/* Sends the job to the SJA engine. */
	submitJob = async (index) => {
		var { fileList, fileStatus, fileCoverage, jobIDs, fileKbuildup,
			fileFlaking, fileGhosting, fileStreaking, fileTransfer, fileWrinkleCurl } = this.state;
		var tempValues = { ...this.props.final_output };

		console.log("fileList: ", fileList);
		console.log("JOB ID: ", jobIDs);
		console.log("tempValues: ", tempValues);

		/* Remove file extension, case insensitive. Apply maxCoverage value. */
		// tempValues.jobName = fileList[index].name.split(/(.pdf)/i)[0]; JOBNAME BECOMES FILENAME
		tempValues.inputProperties.pdfMaxCoverage = fileCoverage[index];
		tempValues.inputProperties.lowKBuild = fileKbuildup[index];
		tempValues.inputProperties.transferRisk = fileTransfer[index];
		tempValues.inputProperties.flakingRisk = fileFlaking[index];
		tempValues.inputProperties.streakingRisk = fileStreaking[index];
		tempValues.inputProperties.ghostingRisk = fileGhosting[index];
		tempValues.inputProperties.wcRisk = fileWrinkleCurl[index];

		console.log("About to print bodyoutput:")
		console.log(JSON.stringify(tempValues))
		console.log("About to print jobname:")
		console.log(tempValues.jobName)
		/* POST the job to the SJA engine. */
		await fetch(appConfig.sjaApiUrl + "ruleset/"+this.props.ruleset+'/job', {
			method: 'POST',
			body: JSON.stringify(tempValues),
			headers: {
				'Content-Type': 'application/json'
			}
		}).then(function (response) {
			// console.log("DATA: ", response);
			if (response.ok)
				return response.json();

			throw new Error(response.text());
		}).then((data) => {
		/* Make copies of current state arrays. */
			let tempStatus = [...fileStatus];
			let tempJobIDs = [...jobIDs];
			console.log("data response recieved from BE job post, it was ok")
			/* Capture jobID and set status tag in copied arrays. */
			tempJobIDs[index] = data.jobID;
			tempStatus[index] = 2;

		/* Save the changes to the actual state arrays. */
			this.setState({
				fileStatus: tempStatus,
				jobIDs: tempJobIDs,
			});
		}).catch((err) => {
			console.log("Error in POST call: ", err);
		});

		/* Rebuild modal content to refresh view and update status. */
		this.buildModalContent();
	}

	/* Handles queueing jobs, applying submitJob() to each job in sequence.
	 * Waits for job to complete before moving to the next. */
	submitJobHandler = async () => {
		/* Submits the jobs, waiting to finish before moving to next job. */
		// for (let i = 0; i < this.state.fileStatus.length; i++)
			await this.submitJob(0);

		/* Grabs all of the jobIDs in the state array, joins them into a comma-separated string. */
		var idString = [...this.state.jobIDs];
		idString = this.state.jobIDs[0];//idString.join();

		/* Saves the idString to state, used for redirecting to Job Results page. */
		this.setState({ idString: idString })

		/* Wait a bit to set complete so that users can see that jobs are done. */
		setTimeout(() => {
			this.setState({ complete: true,  });
		}, 2000);
	}

	render() {
		var { uploadReady, complete, idString } = this.state;
		let { LOCALE } = this.props;
		// console.log("LOCALE: ", LOCALE);

		/* Only start POSTing to Rules Engine if all files are done being processed.
		 * 'this.trigger' ensures that this function is called at most one time to prevent double POSTing. */
		if (uploadReady && this.trigger) {
			this.trigger = false;

			/* Invoke the jobHandler to upload each job one-by-one. */
			this.submitJobHandler();
		}

		/* When all files are done being uploaded and have jobIDs associated with them,
		 * redirect the user to the Job Results page for said jobs. */
		if (complete)
			//return <Navigate to={{ pathname: '/job-history', search: '?res=true?IDs=' + idString }} />;
			//return <JobHistory navigate={ '/job-history?res=true?IDs=' + idString } />;
			window.location.href = '/job-history?res=true?IDs=' + idString;
		else
			return (
				<Translator
      			to={LOCALE}
      			from='en'
      			googleApiKey={appConfig.googleApiKey}>
				<Fragment>
					<strong><span style={{ color: 'red' }}><Translate>Caution:</Translate></span>&nbsp;&nbsp;&nbsp;<Translate>Do not exit this page while files are uploading!</Translate></strong>
					<br /><br />

					{this.state.modalContent}

					<br />

					{/* Tell user that they are being redirected once the jobs are finished uploading. */}
					{idString !== "" ?
						<span><b><Translate>Jobs uploaded. Redirecting...</Translate></b></span>
						:
						<span>&nbsp;</span>
					}
				</Fragment>
				</Translator>
			);
	}
}