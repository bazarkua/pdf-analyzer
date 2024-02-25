import 'bootstrap/dist/css/bootstrap.css';
import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { Menu, Layout, Icon } from 'antd';
import { Home } from './Home';

import NewJob from './NewJob';
import JobHistory from './JobHistory';
import { JobResults } from './JobResults';
import { Translator, Translate } from 'react-auto-translate';

import 'antd/dist/antd.css';
import Style from '../css/App.module.css'

const { Content } = Layout;

const appConfig = require('../config.json');

/* TEST */
/* The main page of the site, essentially a container. All other pages are rendered within.
 * Allows the navigation bar to be visible on every page, handles window dimensions with an eventlistener. */
export default class App extends Component {
	state = {
		currentPage: 'home',
		LOCALE: 'en',
		res: false,
		id: null
	};

	/* Highlights the proper tab in the navigation bar, even after page refresh. */
	componentDidMount = () => {
		// Get the current page for the menu
		var URL = window.location.href;

		/* Sets the current page that the user is on. Used for highlighting the correct tab in the navigation bar.
		 * This is a kind of messy way of doing this, but it doesn't really matter. */
		if (URL.includes('new-job')) {
			this.setState({ currentPage: 'new-job' });
		} else if (URL.includes('new-job2')) {
			this.setState({ currentPage: 'new-job2' }); 
		} else if (URL.includes('job-history')) {
			this.setState({currentPage: 'job-history' });
		} else if (URL.includes('job-results')) {
			this.setState({currentPage: 'job-results' });
		} else {
			this.setState({ currentPage: 'home' });
		}

		/* Add event listener for window resize. Helps with table formatting on small screens. */
		this.updateWindowDimensions();
		window.addEventListener('resize', this.updateWindowDimensions);
	}

	/* Called when the component is unmounted. Removes the event listener. */
	componentWillUnmount = () => {
		window.removeEventListener('resize', this.updateWindowDimensions);
	}

	/* Gets window dimensions. */
	updateWindowDimensions = () => {
		this.setState({ windowWidth: window.innerWidth, windowHeight: window.innerHeight });
	}

	/* When a menu item is clicked, set the correct page. */
	handleMenuClick = (page) => {
		if (page === "navImage")
			this.setState({ currentPage: 'home' });
		else
			this.setState({ currentPage: page });
	};

	onChange = (event) => {
		//LOCALE = event.target.value;
		this.setState({LOCALE: event.target.value});
		//return(<Home LOCALE = {event.target.value} />);
	}

	render() {
		return (
			<Translator
      			to={this.state.LOCALE}
      			from='en'
      			googleApiKey={appConfig.googleApiKey}>
			<Router>
				<Layout>
					{/* The navigation bar. Each entry links to its respective page. */}
					<Menu onClick={(e) => {this.handleMenuClick(e.key)}} selectedKeys={[this.state.currentPage]} mode="horizontal">
						<Menu.Item key="navImage">
							<img
								className={Style.navIcon}
								src='SJA-logo.svg' 
                                height="30px"
								alt="Smart Job Advisor"
							/>
							<Link to="/" />
						</Menu.Item>

						<Menu.Item key="home">
							<Icon className={Style.navIcon} type="home" />
							<Translate>Home</Translate>
							<Link to="/" />
						</Menu.Item>

						<Menu.Item key="new-job">
							<Icon className={Style.navIcon} type="plus" />
							<Translate>New Job</Translate>
							<Link to="/new-job" />
						</Menu.Item>

						<Menu.Item key="new-job2">
							<Icon className={Style.navIcon} type="plus" />
							<Translate>Use Case 2</Translate>
							<Link to="/new-job2" />
						</Menu.Item>

						<Menu.Item key="job-history">
							<Icon className={Style.navIcon} type="history" />
							<Translate>Job History</Translate>
							<Link to="/job-history" />
						</Menu.Item>

						<select onChange={this.onChange} value={this.state.value} className={Style.lang}>
							<option value="en">English</option>
							<option value="fr">French</option>
							<option value="de">German</option>
							<option value="es">Spanish</option>
							<option value="ja">Japanese</option>
						</select>
					</Menu>

					{/* Used to define what component is rendered when Link is called. */}
					<Content style={{ height: 'calc(100vh - 48px)' }}>
						<div className={Style.mainContent}>
							<Routes>
                                <Route exact path='/' element={<Home callback={this.handleMenuClick} LOCALE={this.state.LOCALE} windowWidth={this.state.windowWidth} windowHeight={this.state.windowHeight} />} />
                                <Route exact path='/new-job' element={<NewJob LOCALE={this.state.LOCALE} windowWidth={this.state.windowWidth} windowHeight={this.state.windowHeight} />} />
								<Route exact path='/new-job2' element={<NewJob speedSlider={true} LOCALE={this.state.LOCALE} windowWidth={this.state.windowWidth} windowHeight={this.state.windowHeight} />} />
								<Route exact path='/job-history' element={<JobHistory LOCALE={this.state.LOCALE} windowWidth={this.state.windowWidth} windowHeight={this.state.windowHeight} />} />
								<Route path='/job-results' element={<JobResults windowWidth={this.state.windowWidth} windowHeight={this.state.windowHeight} />}/>
							</Routes>
						</div>
					</Content>

				</Layout>
			</Router>
			</Translator>
		);
	}
}