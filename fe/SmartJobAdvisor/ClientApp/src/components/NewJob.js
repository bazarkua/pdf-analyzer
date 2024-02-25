import React, { Component } from 'react';
import { Redirect } from 'react-router';
import { Button, Checkbox, Form, Icon, Input, InputNumber, notification, Popover, Radio, Row, Col, Select, Slider, Upload, Modal } from 'antd';
import { instanceOf } from 'prop-types';
import { withCookies, Cookies } from 'react-cookie';

import Style from '../CSS/NewJob.module.css'
import { JobUpload } from './JobUpload';
import { Translator, Translate } from 'react-auto-translate';

const appConfig = require('../config.json');

/* Import all text for info buttons. */
import {
	jobNameInfo,
	rulesetInfo,
	qualityModeInfo,
	pressUnwinderBrandInfo,
	maxCoverageInfo,
	opticalDensityInfo,
	paperMfrInfo,
	paperNameInfo,
	paperTypeInfo,
	paperSubTypeInfo,
	paperWeightInfo,
	paperFinishInfo
} from './NewJobInfo';
import { T } from 'antd/lib/upload/utils';
import translate from 'react-auto-translate/lib/commonjs/translate';

const { Option } = Select;

/* An AntD InputNumber with a label on the right. */
class BetterInputNumber extends Component {
	render() {
		if (this.props.addonAfter) {
			return (
				<div className={Style.betterInputNumberDiv}>
					<InputNumber
						{...this.props}
						style={{ verticalAlign: 'middle', borderBottomRightRadius: 0, borderTopRightRadius: 0, width: 60 }}
						value={this.props.value}
						onChange={(e) => this.props.onSliderChange(e, this.props.field)}
					/>
					<div style={{ paddingTop: '2px', verticalAlign: 'middle', display: 'inline-table', lineHeight: '24px', height: '32px' }} className="ant-input-group-addon">{this.props.addonAfter}</div>
				</div>
			);
		} else {
			return (
				<InputNumber {...this.props} />
			);
		}
	}
}

/* Holds the form that the user fills out and POSTs to the SJA Engine. */
class NewJobForm extends Component {
	static propTypes = {
		cookies: instanceOf(Cookies).isRequired
	};

	constructor(props) {
		super(props);

		/* Get maxCoverage/opticalDensity values from cookies (if they exist, otherwise use defaults). */
		const { cookies } = props;
		
		var maxC = 50;
		var oD = 100;

		if (typeof cookies.get('maxCoverage') !== 'undefined')
			maxC = parseInt(cookies.get('maxCoverage'));
		if (typeof cookies.get('opticalDensity') !== 'undefined')
			oD = parseInt(cookies.get('opticalDensity'));

		/* Initialize all values and populate radios/selects. */
		this.state = {
			unknownPaper: false,
			paperNameMfrDisabled: false,
			weightgsm: null,
			maxCoverage: maxC,
			opticalDensity: oD,
			fileList: [],
			showSubmitModal: false,
			formValues: null,
			windowWidth: 1000,
			windowHeight: 1000,
		};

	};

	/* Runs before the constructor. */
	componentDidMount = async () => {
		/* Fetch the paper database from the server. Wait unfil fetch is complete to continue. */
		await this.fetchPaperDatabase();
		await this.fetchRulesets();

		/* If there was an error fetching the paper database, don't attempt to populate dropdowns/radios (otherwise it crashes). */
		if (typeof this.state.error === 'undefined' && this.state.error !== true) {
			this.setState({
				currentPaperNames: this.state.paperDatabase,
				paperMfrDropdown: this.getDropdown(this.state.paperDatabase, "manufacturer"),
				paperNameDropdown: this.getDropdown(this.state.paperDatabase, "productname"),
				paperWeightDropdown: this.getDropdown(this.state.paperDatabase, "weightgsm"),
				paperTypeRadio: this.getRadio(this.state.paperDatabase, "papertype"),
				paperSubTypeRadio: this.getRadio(this.state.paperDatabase, "papersubtype"),
				paperFinishRadio: this.getRadio(this.state.paperDatabase, "finish"),
				prevPaperDropdown: this.getPrevPaperCookie()
			});
		}
	}

	/* Called when the window is resized. Gets window dimensions passed from App.js. */
	componentDidUpdate(prevProps) {
		if (prevProps.windowWidth !== this.props.windowWidth || prevProps.windowHeight !== this.props.windowHeight) {
			this.setState({
				windowWidth: this.props.windowWidth,
				windowHeight: this.props.windowHeight
			});
		}
	}

	fetchRulesets = async () => {
		/* Call database to request paperDatabase object. */
		await fetch(appConfig.sjaApiUrl+"/ruleset", {
			method: "GET",
			mode: 'no-cors',
			headers: {
				'Accept': 'application/json',
			}
		}).then(async (res) => {
			console.log("DATA: ", res);
			await res.json().then((data) => {
				console.log(data);
				let rulesetKeys = [];
				for (const [key, value] of Object.entries(data.rulesets)) {
					rulesetKeys.push(key);
				}
				this.setState({ rulesetList: rulesetKeys });
				
			});
		}).catch(err => {
			this.fetchError("fetch ruleset lists");
		});
	}

	/* Fetch the paper database from the server. */
	fetchPaperDatabase = async () => {
		/* Call database to request paperDatabase object. */
		await fetch( appConfig.sjaApiUrl + "paper", {
			method: "GET",
			mode: 'no-cors',
			headers: {
				'Accept': 'application/json',
			}
		}).then(async (res) => {
			console.log("DATA: ", res);
			await res.json().then((data) => {
				console.log("DATA: ", data);
				this.setState({ paperDatabase: data.paperdb });
			});
		}).catch(err => {
			console.log("Error");
			this.fetchError("fetch paper database");
		});
	}

	/* Populate a Select component. */
	getDropdown = (data, key) => {
		/* Initialize the arrays to hold values scraped from data source and Select component Options. */
		var vals = [];
		var dropdown = [];

		/* A bit different for weightgsm, since it needs to be floats instead of strings. */
		if (key === "weightgsm")
			vals = data.map((obj) => { return parseFloat(obj.weightgsm) }).sort((a, b) => { return a - b });
		else
			vals = data.map((obj) => { return obj[key] }).sort();

		/* Filter the array for duplicates. */
		vals = [...new Set(vals)];

		/* Create the dropdown for the Select using the list of names. */
		for (let i = 0; i < vals.length; i++)
			dropdown.push(<Option key={vals[i]}>{vals[i]}</Option>);

		return dropdown;
	};

	/* Get the values for the radio group. */
	getRadio = (data, key, filter = null) => {
		var radio = [];

		/* Filter data based on supplied filters, then sort it. */
		var tempArray = data.map(function (e) { return e[key]; }).filter((v, i, a) => a.indexOf(v) === i).sort();

		for (let i = 0; i < tempArray.length; i++) {
			var disabled = false;

			if (filter !== null) {
				if (filter.indexOf(tempArray[i]) === -1) {
					disabled = true;

					if (this.props.form.getFieldValue(key) === tempArray[i]) {
						this.props.form.resetFields(key);
						this.props.form.resetFields("manufacturer");
						this.props.form.resetFields("productname");
					}
				}
			}

			radio.push(<Radio.Button disabled={disabled} key={i} value={tempArray[i]}>{tempArray[i]}</Radio.Button>);
		}

		return radio;
	}

	/* Autofill radio values / grey out invalid values for selected paper/manufacturer. */
	setRadios = (selected) => {
		const { paperDatabase } = this.state;
		const { setFieldsValue } = this.props.form;

		var paperTypes = [];
		var paperSubTypes = [];
		var paperFinishes = [];
		var paperWeights = [];

		/* Grab all of the types/subtypes/weights/finishes within the list of objects. */
		for (let i = 0; i < selected.length; i++) {
			paperTypes.push(selected[i].papertype);
			paperSubTypes.push(selected[i].papersubtype);
			paperFinishes.push(selected[i].finish);
			paperWeights.push(parseFloat(selected[i].weightgsm));
		}

		/* Filter the lists of types/subtypes/weights/finishes to remove duplicates. */
		paperTypes = [...new Set(paperTypes)];
		paperSubTypes = [...new Set(paperSubTypes)];
		paperFinishes = [...new Set(paperFinishes)];
		paperWeights = [...new Set(paperWeights)];

		/* Sort paperWeights. */
		paperWeights = paperWeights.sort((a, b) => a - b);

		/* If there's only one choice for a radio, just fill it out. */
		if (paperTypes.length === 1)
			setFieldsValue({ papertype: paperTypes[0] });
		if (paperSubTypes.length === 1)
			setFieldsValue({ papersubtype: paperSubTypes[0] });
		if (paperFinishes.length === 1)
			setFieldsValue({ finish: paperFinishes[0] });
		if (paperWeights.length === 1) {
			setFieldsValue({ weightgsm: paperWeights[0] });
			this.setState({ weightgsm: paperWeights[0] });
		}

		/* Set the weightgsm dropdown values. */
		var dropdown = [];
		for (let i = 0; i < paperWeights.length; i++)
			dropdown.push(<Option key={paperWeights[i]}>{paperWeights[i]}</Option>);

		/* Update other radios. Once a choice has been made on a radio, all other options grey out. */
		this.setState({
			paperTypeRadio: this.getRadio(paperDatabase, "papertype", paperTypes),
			paperSubTypeRadio: this.getRadio(paperDatabase, "papersubtype", paperSubTypes),
			paperFinishRadio: this.getRadio(paperDatabase, "finish", paperFinishes),
			paperWeightDropdown: dropdown
		});
	}

	/* Called when a radio button is hit in paper selection. Narrows down mfr and product names, autofills once there is only one option. */
	checkPaperMfrName = (e, field) => {
		const { getFieldValue, setFieldsValue } = this.props.form;
		const { currentPaperNames } = this.state;

		var currentPapers = [...currentPaperNames];

		/* If weightgsm, need to set state. Else assign 'e.target.value' to 'e'. Saves a few lines. */
		if (field === "weightgsm")
			this.setState({ weightgsm: e });
		else
			e = e.target.value;

		setFieldsValue({ [field]: e })
		currentPapers = currentPapers.filter((a) => a[field] === e);

		/* Filter remaining fields to apply constraints. */
		if (typeof getFieldValue("manufacturer") !== 'undefined' && field !== "manufacturer")
			currentPapers = currentPapers.filter((a) => a.manufacturer === getFieldValue("manufacturer"));
		if (typeof getFieldValue("productname") !== 'undefined' && field !== "productname")
			currentPapers = currentPapers.filter((a) => a.productname === getFieldValue("productname"));
		if (typeof getFieldValue("papertype") !== 'undefined' && field !== "papertype")
			currentPapers = currentPapers.filter((a) => a.papertype === getFieldValue("papertype"));
		if (typeof getFieldValue("papersubtype") !== 'undefined' && field !== "papersubtype")
			currentPapers = currentPapers.filter((a) => a.papersubtype === getFieldValue("papersubtype"));
		if (typeof getFieldValue("weightgsm") !== 'undefined' && getFieldValue("weightgsm") !== null && field !== "weightgsm")
			currentPapers = currentPapers.filter((a) => a.weightgsm === getFieldValue("weightgsm"));
		if (typeof getFieldValue("finish") !== 'undefined' && field !== "finish")
			currentPapers = currentPapers.filter((a) => a.finish === getFieldValue("finish"));

		var paperMfrs = [];
		var paperNames = [];

		/* Grab all of the types/subtypes/weights/finishes within the list of objects. */
		for (let i = 0; i < currentPapers.length; i++) {
			paperMfrs.push(currentPapers[i].manufacturer);
			paperNames.push(currentPapers[i].productname);
		}

		/* Filter the array for unique values only. */
		paperMfrs = [...new Set(paperMfrs)];
		paperNames = [...new Set(paperNames)];

		/* If there's only one paper name or manufacturer, then set both. */
		if (paperNames.length === 1)
			setFieldsValue({
				manufacturer: paperMfrs[0],
				productname: currentPapers[0].productname,
			});
		else if (paperMfrs.length === 1)
			setFieldsValue({
				manufacturer: paperMfrs[0],
			});

		/* Refresh the dropdown lists so they only show values applicable to the currently available papers. */
		this.setState({
			currentPaperNames: currentPapers,
			paperMfrDropdown: this.getDropdown(currentPapers, "manufacturer"),
			paperNameDropdown: this.getDropdown(currentPapers, "productname"),
			paperWeightDropdown: this.getDropdown(currentPapers, "weightgsm")
		});

		/* Do the same for the radios. */
		this.setRadios(currentPapers);
	}

	/* Called when the optical density value is changed. */
	onSliderChange = (val, field) => {
		const { setFieldsValue } = this.props.form;

		/* Check to ensure it's a number, not a string. Thanks for catching this one Trey. */
		if (typeof val !== 'number')
			val = 50;
		else {
			/* Set a minimum value, but only for opticalDensity slider. */
			if (val < 50 && field === "opticalDensity")
				val = 50;
			else if (val < 1 && (field === "maxCoverage" || field === "weightgsm"))
				val = 1;
		}

		/* Apply the value to both the form and state. */
		setFieldsValue({ [field]: parseInt(val) });
		this.setState({ [field]: parseInt(val) });
	};

	/* Called when the paper manufacturer is changed.
	 * Repopulates paper names dropdown with papers made by the selected manufacturer. */
	onPaperMfrChange = val => {
		const { setFieldsValue, getFieldValue, resetFields } = this.props.form;

		var dropdown = [];
		var paperNames = [];

		/* Grab all instances that contain the manufacturer selected in the Mfr dropdown. */
		var selectedMfr = this.state.currentPaperNames.filter((e) => e.manufacturer === val);

		/* Grab all of the productnames within the list of objects. */
		for (let i = 0; i < selectedMfr.length; i++)
			paperNames.push(selectedMfr[i].productname);

		/* Filter the list of productnames to remove duplicates. */
		paperNames = paperNames.filter((v, i, a) => a.indexOf(v) === i);

		/* Check to see if currently selected paper name is a product of selected manufacturer.
		 * If it is, leave it, if it's not, clear it. */
		if (paperNames.indexOf(getFieldValue("productname")) === -1)
			resetFields("productname");

		/* Create the paper name dropdown list using the filtered list of productnames. */
		for (let j = 0; j < paperNames.length; j++)
			dropdown.push(<Option key={paperNames[j]}>{paperNames[j]}</Option>);

		/* If there's only one product for the manufacturer, select is automatically. */
		if (paperNames.length === 1)
			setFieldsValue({
				productname: paperNames[0],
			});

		/* Refresh the radios and the papername dropdown. */
		this.setRadios(selectedMfr);
		this.setState({ paperNameDropdown: dropdown, });
	}

	/* Narrows down the paper selection radio buttons when a paper product is selected. */
	onPaperNameChange = val => {
		const { setFieldsValue } = this.props.form;

		var selectedPaper = this.state.paperDatabase.filter((e) => e.productname === val);

		/* Set the manufacturer's name. */
		setFieldsValue({
			manufacturer: selectedPaper[0].manufacturer,
		});

		/* Refresh the radios. */
		this.setRadios(selectedPaper);
	};

	/* If checkbox is checked: make manufacturer and paper name NOT required; swap Select component for Slider. */
	handleUnknownPaper = () => {
		const { unknownPaper, paperNameMfrDisabled } = this.state;

		this.setState({
			unknownPaper: !unknownPaper,
			paperNameMfrDisabled: !paperNameMfrDisabled,
		});

		/* Putting a timeout here fixes a weird bug where the "weightgsm" field decorator gets deleted. */
		setTimeout(() => {
			this.paperReset();
		}, 100);
		
	}

	/* Resets all the paper selection radio disabled values. */
	resetPaperSelectionRadio = () => {
		let { paperDatabase } = this.state;

		this.setState({
			paperTypeRadio: this.getRadio(paperDatabase, "papertype"),
			paperSubTypeRadio: this.getRadio(paperDatabase, "papersubtype"),
			paperFinishRadio: this.getRadio(paperDatabase, "finish"),
		});
	}

	/* Resets all form fields for paper selection. */
	paperReset = () => {
		const { paperDatabase } = this.state;

		this.props.form.resetFields(["manufacturer", "productname", "papertype", "papersubtype", "weightgsm", "finish"]);
		this.resetPaperSelectionRadio();

		this.setState({
			paperMfrDropdown: this.getDropdown(paperDatabase, "manufacturer"),
			paperNameDropdown: this.getDropdown(paperDatabase, "productname"),
			paperWeightDropdown: this.getDropdown(paperDatabase, "weightgsm"),
			currentPaperNames: paperDatabase,
			weightgsm: null,
		});
	}

	/* Resets the job info section. */
	infoReset = () => {
		var yes = window.confirm("Clear all fields?");
		if (yes) {
			this.props.form.resetFields(["jobName", "ruleset", "qualityMode", "pressUnwinderBrand", "maxCoverage", "opticalDensity"]);
			this.setState({
				unknownPaper: false,
				maxCoverage: 50,
				opticalDensity: 100,
				//values.qualityMode = null,
				//values.pressUnwinderBrand = null,
			});
			//setFieldsValue({ qualityMode: null });
			//setFieldsValue({ pressUnwinderBrand: null });
		};
	}

	/* Auto-fills Paper Selection section with the paper chosen from the "Recent papers" dropdown (cookie). */
	handlePrevPaper = (val) => {
		const { cookies } = this.props;
		const { setFieldsValue } = this.props.form;

		/* Get the list of previously-used papers from the cookie. */
		var paperList = cookies.get("prevPapers");

		/* Apply its values to auto-fill the form. */
		setFieldsValue({ manufacturer: paperList[val].manufacturer });
		setFieldsValue({ productname: paperList[val].productname });
		setFieldsValue({ papertype: paperList[val].papertype });
		setFieldsValue({ papersubtype: paperList[val].papersubtype });
		setFieldsValue({ weightgsm: paperList[val].weightgsm });
		setFieldsValue({ finish: paperList[val].finish });

		/* Need to set a state value for weightgsm since the select component is dependent on it. */
		this.setState({ weightgsm: paperList[val].weightgsm });
	}

	/* Constructs the dropdown for selection of commonly-used paper, gotten from the cookie. */
	getPrevPaperCookie = () => {
		const { cookies } = this.props;

		/* Initialize the arrays to hold values scraped from data source and Select component Options. */
		var vals = [];
		var dropdown = [];

		vals = cookies.get('prevPapers');

		if (typeof vals !== 'undefined') {
			/* Create the dropdown for the Select using the list of names. */
			for (let i = 0; i < vals.length; i++) {
				var name =
					vals[i].manufacturer + ' - ' +
					vals[i].productname  + ' | ' +
					vals[i].papertype    + ' | ' +
					vals[i].papersubtype + ' | ' +
					vals[i].weightgsm    + ' gsm | ' +
					vals[i].finish;

				dropdown.push(<Option key={i}>{name}</Option>);
			}

			return dropdown;
		} else {
			return null;
		}
	}

	/* Set cookies to remember jobName/ruleset/qualityMode/pressUnwinderBrand/maxCoverage/opticalDensity for next time. */
	setCookies = (values) => {
		const { cookies } = this.props;

		/* Set cookies for General Info section. */
		cookies.set('ruleset', values.ruleset, { path: '/', maxAge: 31536000 });
		cookies.set('qualityMode', values.qualityMode, { path: '/', maxAge: 31536000 });
		cookies.set('pressUnwinderBrand', values.pressUnwinderBrand, { path: '/', maxAge: 31536000 });
		cookies.set('opticalDensity', values.opticalDensity, { path: '/', maxAge: 31536000 });

		/* Only set these cookies if a PDF was NOT uploaded. */
		if (this.state.fileList.length === 0) {
			cookies.set('jobName', values.jobName, { path: '/', maxAge: 31536000 });
			cookies.set('maxCoverage', values.maxCoverage, { path: '/', maxAge: 31536000 });
		}

		/* Set cookie for recently-used papers in the Paper Selection section. This list will hold the
		 * last five selected papers. When an item is chosen from the list, it is moved to the top. If
		 * a new paper is used instead that it not on the list, push it to the front, pop off the last one. */
		/* Only do this if a known paper was selected! */
		if (!this.state.unknownPaper) {
			var paperList = [];
			if (typeof cookies.get('prevPapers') !== 'undefined')
				paperList = cookies.get('prevPapers');

			/* Create object for the paper that was selected. */
			var usedPaper = {};

			usedPaper.manufacturer = values.manufacturer;
			usedPaper.productname = values.productname;
			usedPaper.papertype = values.papertype;
			usedPaper.papersubtype = values.papersubtype;
			usedPaper.weightgsm = values.weightgsm;
			usedPaper.finish = values.finish;

			/* Compare the newly-created usedPaper object to the existing objects in the cookie. */
			var exists = false;
			for (let i = 0; i < paperList.length; i++) {
				/* If the item already exists in the array, move it to the front. */
				if (JSON.stringify(usedPaper) === JSON.stringify(paperList[i])) {
					paperList.splice(i, 1);
					paperList.unshift(usedPaper);
					exists = true;
					break;
				}
			}

			/* If the newly-created usedPaper object was not found in the list:
			 *    If < 5 items, just add usedPaper to the list
			 *    If = 5 items, remove oldest, then push usedPaper */
			if (!exists) {
				if (paperList.length === 10)
					paperList.splice(9, 1);

				paperList.unshift(usedPaper);
			}

			cookies.set('prevPapers', paperList, { path: '/', maxAge: 31536000 });
		}
	}

	/* Gathers and validates form data, then makes a POST call to the rules engine. */
	handleSubmit = e => {
		e.preventDefault();
		this.props.form.validateFields(async (err, values) => {
			if (!err) {
				/* This is here so the values of the form can be seen in the console for debugging. */
				console.log('Received values of form: ', values);

				/* Force weightgsm to be an int on the off chance it's passed as a string. */
				values.weightgsm = parseInt(values.weightgsm);

				/* Set cookies for next time. */
				this.setCookies(values);

				/* Open the modal for submitting files, only if files were added. */
				if (this.state.fileList.length > 0) {
					this.setState({ formValues: values }, () => {
						this.setState({ showSubmitModal: true });
					});
				} else {
					/* Call database to post form data. */
					await fetch(appConfig.sjaApiUrl + 'new-job/', {
						method: 'POST',
						mode: 'cors',
						body: JSON.stringify(values),
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json',
						}
					}).then(async (res) => {
						await res.json().then((data) => {
							this.setState({
								createdID: data.id,
								jobCreated: true
							});
						});
					}).catch(() => {
						this.fetchError("submit job");
					});
				}
			}
		});
	};

	/* Called when there is an error in a fetch call. */
	fetchError = (type, description = <Translator
										to={this.props.LOCALE}
										from='en'
										googleApiKey={process.env.REACT_APP_GOOGLE_API_KEY}> 
											<Translate>The server is probably down. Try again later.</Translate> 
										</Translator>) => {
		this.alertPresent = false;

		/* This is for debouncing, so the alert doesn't appear twice. */
		if (!this.alertPresent) {
			this.alertPresent = true

			notification['error']({
				message: <Translator
							to={this.props.LOCALE}
							from='en'
							googleApiKey={process.env.REACT_APP_GOOGLE_API_KEY}>
								<Translate>Failed to </Translate><Translate>{type}</Translate>.
							</Translator>,
				description: description,
				duration: 3
			});

			setTimeout(() => {
				this.alertPresent = false;
			}, 1000);
		}

		this.setState({ error: true });
	}

	/* Called when a PDF is uploaded. Updates list that will be passed to JobUpload componenet. */
	handleFileUpload = info => {
		let fileList = [...info.fileList];

		/* Read from response and show file link. */
		fileList = fileList.map(file => {
			if (file.response)
				file.url = file.response.url;

			return file;
		});

		this.setState({ fileList });
	};

	render() {
		/* Initialize cookies. */
		const { cookies } = this.props;
		const {
			weightgsm,
			maxCoverage,
			opticalDensity,
			paperNameMfrDisabled,
			unknownPaper,
			fileList,
			jobCreated,
			createdID,
			error,
			showSubmitModal,
			formValues,
			windowWidth,
		} = this.state;
		const { getFieldDecorator } = this.props.form;
		let { LOCALE } = this.props;

		/* Some formatting to change the form layout when the width of the window is < 575px. */
		const paperFormItemLayout = {
			labelCol: {
				xs: { span: 24 },
				sm: { span: 5 },
			},
			wrapperCol: {
				xs: { span: 24 },
				sm: { span: 19 },
			},
		}

		/* Some props for the file upload: adds loading bar, forces PDF only,
		 * allows multiple, sets function to call when file is uploaded. */
		const uploadProps = {
			onRemove: file => {
				this.setState(state => {
					const index = state.fileList.indexOf(file);
					const newFileList = state.fileList.slice();
					newFileList.splice(index, 1);
					return {
						fileList: newFileList,
					};
				});
			},
			beforeUpload: file => {
				this.setState(state => ({
					fileList: [...state.fileList, file],
				}));
				return false;
			},
			fileList,
			multiple: true,
			accept: ".pdf"
		};

		if (jobCreated && error != true)
			if (typeof createdID !== 'undefined')
				return <Redirect to={{ pathname: '/job-results', search: '?justifications=true?IDs=' + createdID }} />;
			else
				this.fetchError("generate job(s)", "The SJA Engine probably does not yet recognize the selected paper.")
		else
			return (
				<Translator
      			to={LOCALE}
      			from='en'
      			googleApiKey={process.env.REACT_APP_GOOGLE_API_KEY}>

				<div className={Style.newJobFormContainer}>
					<h1><Translate>New Job</Translate></h1>
					<br />
					<Form layout="vertical" onSubmit={this.handleSubmit} className={Style.newJobForm}>
						<div style={{ display: 'inline-block' }}>
							<Row gutter={20}>
							<Form.Item
								style={{ marginBottom: 5 }}
								label={
									<>
										<span><Translate>Job Name:</Translate></span>
										<Popover content={jobNameInfo} title="Job Name" placement="bottom">
											<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 8, bottom: -2 }} type="info-circle" />
										</Popover>
									</>
								}
							>
								{getFieldDecorator('jobName', {
									rules: [{ required: fileList.length === 0, message: <Translate>Please input a job name</Translate> }],
									initialValue: cookies.get('jobName') || "Setting Advice",
								})(
									<Input
										className={Style.formItemInput}
										prefix={<Icon type="edit" style={{ color: 'rgba(0,0,0,.25)' }} />}
										disabled={fileList.length > 0}
									/>,
								)}
							</Form.Item>
						
							</Row>
						</div>
						<Row gutter={20}>
						<div style={{ display: 'inline-block' }}>
							<h5>
							<Translate>Configuration</Translate>
								<Button className={Style.resetButtonInfo} onClick={() => this.infoReset()} type="default" >
									<Icon style={{ position: 'relative', bottom: 3 }} type="undo" />
									{windowWidth >= 385 ?
										<span><Translate> Reset</Translate></span>
										:
										null
									}
								</Button>
							</h5>
							</div>
							</Row>
						<Row gutter={20}>
							
							<Col span={12}>
								<Form.Item
									style={{ marginBottom: -5 }}
									label={
										<>
											<span><Translate>Ruleset:</Translate></span>
											<Popover content={rulesetInfo} title={<Translate>Ruleset</Translate>} placement="bottom">
												<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 8, bottom: -2 }} type="info-circle" />
											</Popover>
										</>
									}
								>
									{getFieldDecorator('ruleset', {
										rules: [{ required: true, message: <Translate>Please select a ruleset from the dropdown menu</Translate> }],
										initialValue: cookies.get('ruleset') || null,
									})(
										<Select className={Style.formItemInput}>
											<Option value="T24">T24</Option>
											<Option value="T25">T25</Option>
										</Select>
									)}
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={20}>
							<Col span={12}>
								<Form.Item
									style={{ marginBottom: -5 }}
									label={
										<>
											<span><Translate>Quality Mode:</Translate></span>
											<Popover content={qualityModeInfo} title={<Translate>Quality Mode</Translate>} placement="bottom">
												<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 8, bottom: -2 }} type="info-circle" />
											</Popover>
										</>
									}
								>
									{getFieldDecorator('qualityMode', {
										rules: [{ required: true, message: <Translate>Please choose quality mode</Translate> }],
										initialValue: cookies.get('qualityMode') || null,
									})(
										<Radio.Group className={Style.formItemPaper}>
											<Radio.Button value="Quality" id="q"><Translate>Quality</Translate></Radio.Button>
											<Radio.Button value="Performance" id="p"><Translate>Performance</Translate></Radio.Button>
										</Radio.Group>
									)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									style={{ marginBottom: -5 }}
									label={
										<>
											<span><Translate>Press Unwinder Brand:</Translate></span>
											<Popover content={pressUnwinderBrandInfo} title={<Translate>Press Unwinder Brand</Translate>} placement="bottom">
												<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 8, bottom: -2 }} type="info-circle" />
											</Popover>
										</>
									}
								>
									{getFieldDecorator('pressUnwinderBrand', {
										rules: [{ required: true, message: <Translate>Please choose a press unwinder brand</Translate> }],
										initialValue: cookies.get('pressUnwinderBrand') || null,
									})(
										<Radio.Group className={Style.formItemPaper}>
											<Radio.Button value="EMT" id="emt">EMT</Radio.Button>
											<Radio.Button value="HNK" id="hnk">HNK</Radio.Button>
										</Radio.Group>
									)}
								</Form.Item>
							</Col>
							</Row>
							
								<Form.Item
									label={
										<>
											<span><Translate>Optical Density:</Translate></span>
											<Popover content={opticalDensityInfo} title="Optical Density" placement="bottom">
												<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 8, bottom: -2 }} type="info-circle" />
											</Popover>
										</>
									}
								>
									{getFieldDecorator('opticalDensity', {
										rules: [{ required: true }],
										initialValue: parseInt(cookies.get('opticalDensity')) || 100,
									})(
										<div style={{ display: 'flex', marginBottom: '-10px' }} >
											<Slider
												className={Style.formItemInput}
												style={{ width: 'calc(100% - 122px)', marginRight: 15 }}
												step={5}
												min={0}
												max={100}
												onChange={(e) => this.onSliderChange(e, "opticalDensity")}
												value={opticalDensity}
											/>
											<BetterInputNumber
												step={5}
												addonAfter="%"
												value={opticalDensity}
												field="opticalDensity"
												onSliderChange={this.onSliderChange}
											/>
										</div>
									)}
								</Form.Item>
							
						<div style={{ display: 'inline-block' }}>
							<h5>
								PDF
									<Upload {...uploadProps} fileList={fileList}>
									<Button className={Style.uploadButton} style={{ marginLeft: -3 }} type="primary" ghost>
										<Icon style={{ position: 'relative', bottom: 3 }} type="upload" />
										{windowWidth >= 385 ?
											<span>Upload PDFs</span>
											:
											<span>Upload</span>
										}
									</Button>
								</Upload>
							</h5>
						</div>
						<Row gutter={20}>
						<Form.Item
							style={{ marginBottom: 5 }}
							label={
								<>
									<span><Translate>PDF Max Coverage:</Translate></span>
									<Popover content={maxCoverageInfo} title={<Translate>PDF Max Coverage</Translate>} placement="bottom">
										<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 8, bottom: -2 }} type="info-circle" />
									</Popover>
								</>
							}
						>
							{getFieldDecorator('maxCoverage', {
								rules: [{ required: fileList.length === 0 }],
								initialValue: parseInt(cookies.get('maxCoverage')) || 50,
							})(
								<div style={{ display: 'flex', marginBottom: '-10px' }} >
									<Slider
										className={Style.formItemInput}
										style={{ width: 'calc(100% - 122px)', marginRight: 15 }}
										min={0}
										max={100}
										onChange={(e) => this.onSliderChange(e, "maxCoverage")}
										value={maxCoverage}
										disabled={fileList.length > 0}
									/>
									<BetterInputNumber
										addonAfter="%"
										value={maxCoverage}
										field="maxCoverage"
										onSliderChange={this.onSliderChange}
										disabled={fileList.length > 0}
									/>
								</div>
							)}
								</Form.Item>
						
						</Row>

						<div style={{
							display: 'inline-block', width: 'calc(100% + 1px)'}}>
							<h5>
								<Translate>Paper Selection</Translate>
								<Checkbox
									style={{ position: 'relative', bottom: 2, marginRight: 16, marginBottom: 10 }}
									onChange={() => this.handleUnknownPaper()}
									checked={unknownPaper}
								>
									<Translate>Unknown Paper?</Translate>
								</Checkbox>
								{!unknownPaper ?
									<Select
										className={Style.formItemPaper}
										style={{ maxWidth: 178, postition: 'relative', bottom: 2 }}
										onChange={(val) => this.handlePrevPaper(val)}
										dropdownMatchSelectWidth={false}
										placeholder={<Translate>Recent papers</Translate>}
									>
										{this.state.prevPaperDropdown}
									</Select>
									:
									null
								}
							</h5>
						</div>
						<Form.Item
							{...paperFormItemLayout}
							style={{ marginBottom: 0 }}
							label={
								<>
									<span><Translate>Mfr:</Translate></span>
									<Popover content={paperMfrInfo} title={<Translate>Manufacturer</Translate>} placement={windowWidth <= 500 ? "bottom" : "bottomLeft"}>
										<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 15, bottom: -2 }} type="info-circle" />
									</Popover>
								</>
							}
						>
							{getFieldDecorator('manufacturer', {
								rules: [{ required: !paperNameMfrDisabled, message: <Translate>Please select a manufacturer</Translate> }],
							})(
								<Select
									className={Style.formItemPaper}
									style={{ maxWidth: 320 }}
									disabled={paperNameMfrDisabled}
									onChange={this.onPaperMfrChange}
									showSearch
									showArrow={false}
									placeholder={ paperNameMfrDisabled === true ?
										<span><Translate>Disabled</Translate></span>
										:
									<span><Icon type="search" className={Style.iconAdjust} />&nbsp;<Translate>Select manufacturer</Translate></span>
									}
								>
									{this.state.paperMfrDropdown}
								</Select>
							)}
						</Form.Item>
						<Form.Item
							{...paperFormItemLayout}
							style={{ marginBottom: 0 }}
							label={
								<>
									<span><Translate>Name:</Translate></span>
									<Popover content={paperNameInfo} title={<Translate>Product Name</Translate>} placement={windowWidth <= 500 ? "bottom" : "bottomLeft"}>
										<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 20, bottom: -2 }} type="info-circle" />
									</Popover>
								</>
							}
						>
							{getFieldDecorator('productname', {
								rules: [{ required: !paperNameMfrDisabled, message: <Translate>Please select a paper</Translate> }],
							})(
								<Select
									className={Style.formItemPaper}
									style={{ maxWidth: 320 }}
									disabled={paperNameMfrDisabled}
									onChange={this.onPaperNameChange}
									showSearch
									showArrow={false}
									placeholder={
										paperNameMfrDisabled === true ? <span><Translate>Disabled</Translate></span>
											: <span><Icon type="search" className={Style.iconAdjust} />&nbsp;<Translate>Select paper</Translate></span>
									}
								>
									{this.state.paperNameDropdown}
								</Select>
							)}
						</Form.Item>

						<Form.Item
							{...paperFormItemLayout}
							style={{ marginBottom: 0 }}
							label={
								<>
									<span><Translate>Type:</Translate></span>
									<Popover content={paperTypeInfo} title={<Translate>Paper Type</Translate>} placement={windowWidth <= 500 ? "bottom" : "bottomLeft"}>
										<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 25, bottom: -2 }} type="info-circle" />
									</Popover>
								</>
							}
						>
							{getFieldDecorator('papertype', {
								rules: [{ required: true, message: <Translate>Please choose a paper type</Translate> }],
							})(
								<Radio.Group
									className={Style.formItemPaper}
									onChange={(e) => {
										if (!paperNameMfrDisabled)
											this.checkPaperMfrName(e, "papertype");
									}}
								>
									{this.state.paperTypeRadio}
								</Radio.Group>
							)}
						</Form.Item>
						<Form.Item
							{...paperFormItemLayout}
							style={{ marginBottom: 0 }}
							label={
								<>
									<span><Translate>Sub-Type:</Translate></span>
									<Popover content={paperSubTypeInfo} title={<Translate>Paper Sub-Type</Translate>} placement={windowWidth <= 500 ? "bottom" : "bottomLeft"}>
										<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 12, bottom: -2 }} type="info-circle" />
									</Popover>
								</>
							}
						>
							{getFieldDecorator('papersubtype')(
								<Radio.Group
									className={Style.formItemPaper}
									onChange={(e) => {
										if (!paperNameMfrDisabled)
											this.checkPaperMfrName(e, "papersubtype");
									}}
								>
									{this.state.paperSubTypeRadio}
								</Radio.Group>
							)}
						</Form.Item>
						<Form.Item
							{...paperFormItemLayout}
							style={{ marginBottom: 0 }}
							label={
								<>
									<span><Translate>Weight:</Translate></span>
									<Popover content={paperWeightInfo} title={<Translate>Paper Weight</Translate>} placement={windowWidth <= 500 ? "bottom" : "bottomLeft"}>
										<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 15, bottom: -2 }} type="info-circle" />
									</Popover>
								</>
							}
						>
							{getFieldDecorator('weightgsm', {
								rules: [{ required: true, message: <Translate>Please choose a weight in gsm</Translate> }],
								initialValue: weightgsm || null
							})(
								unknownPaper ?
									<div style={{ display: 'flex', marginBottom: '-20px' }} >
										<Slider
											className={Style.formItemInput}
											style={{ width: 'calc(100% - 167px)', marginRight: 15 }}
											min={0}
											max={500}
											value={weightgsm || 0}
											onChange={(e) => this.onSliderChange(e, "weightgsm")}
										/>
										<BetterInputNumber
											addonAfter="gsm"
											value={weightgsm || null}
											field="weightgsm"
											onSliderChange={this.onSliderChange}
										/>
									</div>
									:
									<>
										<Select
											className={Style.formItemPaper}
											style={{ maxWidth: 80 }}
											showSearch
											showArrow={false}
											onChange={(e) => this.checkPaperMfrName(e, "weightgsm")}
											placeholder={<span><Translate>Weight</Translate></span>}
											value={weightgsm || undefined}
										>
											{this.state.paperWeightDropdown}
										</Select>
										<div className="ant-input-group-addon" style={{ position: 'relative', borderBottomLeftRadius: 2, borderTopLeftRadius: 2, bottom: 6, paddingTop: '2px', verticalAlign: 'middle', display: 'inline-table', lineHeight: '24px', height: '32px' }}>gsm</div>
									</>
							)}
						</Form.Item>
						<Form.Item
							{...paperFormItemLayout}
							style={{ marginBottom: 0 }}
							label={
								<>
									<span><Translate>Finish:</Translate></span>
									<Popover content={paperFinishInfo} title={<Translate>Paper Finish</Translate>} placement={windowWidth <= 500 ? "bottom" : "bottomLeft"}>
										<Icon style={{ fontSize: 18, color: 'dodgerblue', position: 'relative', left: 24, bottom: -2 }} type="info-circle" />
									</Popover>
								</>
							}
						>
							{getFieldDecorator('finish', {
								rules: [{ required: true, message: <Translate>Please choose a finish</Translate> }],
							})(
								<Radio.Group
									className={Style.formItemPaper}
									onChange={(e) => {
										if (!paperNameMfrDisabled)
											this.checkPaperMfrName(e, "finish");
									}}
								>
									{this.state.paperFinishRadio}
								</Radio.Group>
							)}
						</Form.Item>

						<br />

						<div className={Style.formButtons}>
							<Button type="primary" onClick={this.handleSubmit} >
								<Translate>Submit</Translate>
							</Button>
						</div>
					</Form>

					{/* Modal for show progress of PDF submission. */}
					{showSubmitModal === true ?
						<Modal title="Uploading Job(s)" visible={showSubmitModal} footer={null}>
							<JobUpload LOCALE={LOCALE} fileList={fileList} formValues={formValues} />
						</Modal>
						:
						null
					}
				</div>
				</Translator>
			);
	}
}

const NewJob = Form.create({ name: 'new-job' })(NewJobForm);

export default withCookies(NewJob);