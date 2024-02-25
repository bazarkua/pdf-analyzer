import { T } from 'antd/lib/upload/utils';
import React from 'react';
//import { Translate } from 'react-auto-translate/lib/commonjs';
import { Translator, Translate } from 'react-auto-translate';

/* This file contains the information held in the info button popups in the NewJob form.
 * Having them all here makes them easier to edit, and saves some space in NewJob.js. */

const jobNameInfo =
	<span><Translate>
		The name to give the Job.        </Translate><br /><br /><Translate>
		Disabled when a PDF is uploaded, </Translate><br /><Translate>
		as the name of the PDF file will </Translate><br /><Translate>
		be used instead.
	</Translate></span>;

const rulesetInfo =
	<span><Translate>
		Which set of rules to apply to the inputs. </Translate><br /><br /><Translate>
		Each ruleset is designed for a specific    </Translate><br /><Translate>
		press family, so the chosen ruleset should </Translate><br /><Translate>
		match the desired press to be used.
	</Translate></span>;

const qualityModeInfo =
	<span><Translate>
		The quality mode of the Job.              </Translate><br /><br /><Translate>
		<b>Quality</b> runs slower, but the final </Translate><br /><Translate>
		output looks nicer.                       </Translate><br /><Translate>
		<b>Performance</b> is much faster, but    </Translate><br /><Translate>
		sacrifices quality for speed.

	</Translate></span>;

const pressUnwinderBrandInfo =
	<span><Translate>
		The brand of press unwinder to </Translate><br /><Translate>
		use for the Job.
	</Translate></span>;

const maxCoverageInfo =
	<span><Translate>
		The maximum ink coverage value for the Job     </Translate><br /><Translate>
		(ratio of ink to page).                        </Translate><br /><br /><Translate>
		The highest single-page coverage value         </Translate><br /><Translate>
		should be used here.                           </Translate><br /><br /><Translate>
		Disabled when a PDF is uploaded, as a tool     </Translate><br /><Translate>
		will be called to automatically calculate this </Translate><br /><Translate>
		value.
	</Translate></span>;

const lowKInfo =
	<span><Translate>
		The average amount of colorful      </Translate><br /><Translate>
		(little black or white) pages.                        
	</Translate></span>;

const transferInfo =
	<span><Translate>
		The percentage of pages with repeated      </Translate><br /><Translate>
		downweb stripes.                        
	</Translate></span>;

const flakingInfo =
	<span><Translate>
		The maximum percentage of high intensity     </Translate><br /><Translate>
		color blotches on a page.                     
	</Translate></span>;

const streakingInfo =
	<span><Translate>
		The number of pages with high coverage    </Translate><br /><Translate>
		overlapping (on front and back).                     
	</Translate></span>;

const ghostingInfo =
	<span><Translate>
		The number of suddenly high ink coverage     </Translate><br /><Translate>
		pages, after 20-30 text pages.                     
	</Translate></span>;

const wcInfo =
<span><Translate>
	The number of double-sided pages     </Translate><br /><Translate>
	with uneven ink coverage.                     
</Translate></span>;

const opticalDensityInfo =
	<span><Translate>
		The optical density value for the Job </Translate><br /><Translate>
		(the average opacity of ink).         </Translate><br /><br /><Translate>
		Cannot be lower than 50%, must be     </Translate><br /><Translate>
		in 5% increments.
	</Translate></span>;

const paperMfrInfo =
	<span><Translate>
		A list of paper manufacturers in the database. </Translate><br /><br /><Translate>
		Narrows as other options are chosen.
	</Translate></span>;

const paperNameInfo =
	<span><Translate>
		A list of paper names in the database. </Translate><br /><br /><Translate>
		Narrows as other options are chosen.
	</Translate></span>;

const paperTypeInfo =
	<span><Translate>
		A list of paper types in the database </Translate><br /><Translate>
		(coated/uncoated, coating type).      </Translate><br /><br /><Translate>
		Narrows as other options are chosen.
	</Translate></span>;

const paperSubTypeInfo =
	<span><Translate>
		A list of paper sub-types in the database. </Translate><br /><br /><Translate>
		Narrows as other options are chosen.
	</Translate></span>;

const paperWeightInfo =
	<span><Translate>
		A list of paper weights in the database           </Translate><br /><Translate>
		(how heavy the paper is, in grams/m</Translate><sup>2</sup>). <br /><br /><Translate>
		Narrows as other options are chosen.
	</Translate></span>;

const paperFinishInfo =
	<span><Translate>
		A list of paper finishes in the database. </Translate><br /><br /><Translate>
		Narrows as other options are chosen.
	</Translate></span>;

const speedInfo=
	<span><Translate>
		The preferred printing speed for the job. </Translate><br /> <br /><Translate>
		Listed in measurement of feet per minute.
	</Translate></span>;

export {
	jobNameInfo,
	rulesetInfo,
	qualityModeInfo,
	pressUnwinderBrandInfo,
	maxCoverageInfo,
	lowKInfo,
	transferInfo,
	flakingInfo,
	streakingInfo,
	ghostingInfo,
	wcInfo,
	opticalDensityInfo,
	paperMfrInfo,
	paperNameInfo,
	paperTypeInfo,
	paperSubTypeInfo,
	paperWeightInfo,
	paperFinishInfo,
    speedInfo
}