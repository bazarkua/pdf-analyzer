import React, { Component } from 'react';
import { Button, Icon } from 'antd';
import { Navigate } from 'react-router';
import { Translator, Translate } from 'react-auto-translate';

const appConfig = require('../config.json');

import Style from '../css/Home.module.css'

/* The homepage of the site. Provides users links to the New Job form and the Job History page. */
export class Home extends Component {
	/* Initialize state variables:
	 *   - 'redirectTarget' :  string containing the URL to redirect the user.
	 *   - 'redirect'       :  trigger for redirect. If true, redirect user to page specified by redirectTarget.
	 */
	state = {
		redirectTarget: '',
		redirect: false,
		//LOCALE: this.props.LOCALE
	};

	render() {
		let { redirect, redirectTarget } = this.state;
		let { callback, LOCALE } = this.props;

		/* If redirect is true, redirect the user to the page specified by redirectTarget. */
		if (redirect === true) {
			redirect = false;
			return <Navigate push to={redirectTarget} />;
		}

		return (
			<Translator
      			to={LOCALE}
      			from='en'
      			googleApiKey={appConfig.googleApiKey}>

			<div className={Style.homePage}>
				{/* SJA logo and title. */}
				<Icon component={() => (
					<img
						src='SJA-logo.svg'
						height="250px"
						alt="Smart Job Advisor"
					/>
				)} />
				<h1>Smart Job Advisor</h1>
				<br />
				<h3><Translate>What would you like to do?</Translate></h3>

				{/* Container to hold buttons, one for New Job and one for Job History. */}
				<div className={Style.buttonContainer}>
					<Button
						className={Style.button}
						onClick={() => {
							callback('new-job');
							this.setState({ redirect: true, redirectTarget: "/new-job" })
						}}
						type="primary"
					>
						<Icon className={Style.buttonIcon} type="plus" />
						<Translate> Add New Job </Translate>
					</Button>
					<Button
						className={Style.button}
						onClick={() => {
							callback('job-history');
							this.setState({ redirect: true, redirectTarget: "/job-history" })
						}}
						type="default"
				>
						<Icon className={Style.buttonIcon} type="history" />
						<Translate> View History </Translate>
					</Button>
				</div>
			</div>
			</Translator>
		);
	}
}