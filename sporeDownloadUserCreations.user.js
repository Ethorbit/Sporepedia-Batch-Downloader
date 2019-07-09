// ==UserScript==
// @name Sporepedia - Download User Creations
// @namespace Violentmonkey Scripts
// @include /^https?:\/\/.*\.spore\.com\/sporepedia.*$/
// @grant GM_download
// @inject-into auto
// @version 0.2.0
// @licence CC0
// ==/UserScript==

/* Licensed under the terms of CC0. https://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

function ifNullThrow (value, errorMessage)
{
	if (value == null)
	{
		throw new Error(errorMessage);
	}

	return value;
}

/* Returns `true` if the element's `display` style is `hidden` or `none`.
Otherwise returns `false`. */
function isElementHidden (element)
{
	const hiddenRegEx = /^hidden|none$/i;
	const computedStyle = window.getComputedStyle(element, null);
	return hiddenRegEx.test(computedStyle.display) || hiddenRegEx.test(computedStyle.visibility);
}

function applyEvent (element, eventName)
{
	element[eventName].apply(element);
}

function sleep (forMilliseconds)
{
	return new Promise(functionToExecute => setTimeout(functionToExecute, forMilliseconds));
}

function splitPath (path)
{
	return path.split(/[/\\]/);
}

function isImageLoaded (assetThumbnail)
{
	const url = AssetThumbnailsPanel.getAssetThumbnailImage(assetThumbnail).src;
	const urlSegments = splitPath(url);
	const filename = urlSegments[urlSegments.length - 1];
	return filename !== 'blank.gif';
}


/* If the SPOREcast functionality seems weirdly implemented, that's because
it is. I only realised that I needed to implement it after finishing the
functionality for normal browsing. */

class AssetThumbnailsPanel
{
	assetThumbnailsPanel;
	nextPageButton;
	previousPageButton;
	sporecastPanel;
	sporecastNextPageButton;
	sporecastPreviousPageButton;

	constructor ()
	{
		this.assetThumbnailsPanel = ifNullThrow(
			document.getElementById('asset-thumbnails'),
			'Could not find asset-thumbnails panel.'
		);

		this.nextPageButton = ifNullThrow(
			this.assetThumbnailsPanel.querySelector('*.js-pagination-forward'),
			'Could not find next-page button.'
		);

		this.previousPageButton = ifNullThrow(
			this.assetThumbnailsPanel.querySelector('*.js-pagination-back'),
			'Could not find previous-page button.'
		);

		this.sporecastPanel = ifNullThrow(
			document.getElementById('sporecastinfo'),
			'Could not find SPOREcast panel.'
		);

		this.sporecastNextPageButton = ifNullThrow(
			this.sporecastPanel.querySelector('*.js-pagination-forward'),
			'Could not find next-page button.'
		);

		this.sporecastPreviousPageButton = ifNullThrow(
			this.sporecastPanel.querySelector('*.js-pagination-back'),
			'Could not find previous-page button.'
		);
	}

	movePage (pageButton)
	{
		const pageCanBeAdvanced = !isElementHidden(pageButton);
		if (pageCanBeAdvanced)
		{
			applyEvent(pageButton, 'click');
		}
		return pageCanBeAdvanced;
	}

	get sporecastPanelIsActive ()
	{
		return !isElementHidden(this.sporecastPanel);
	}

	moveToPreviousPage ()
	{
		const pageButton =
			this.sporecastPanelIsActive ?
			this.sporecastPreviousPageButton :
			this.previousPageButton;

		return this.movePage(pageButton);
	}

	moveToNextPage ()
	{
		const pageButton =
			this.sporecastPanelIsActive ?
			this.sporecastNextPageButton :
			this.nextPageButton;

		return this.movePage(pageButton);
	}

	async getAssetThumbnails (initialPageLoadSleepDuration = 600)
	{
		const thumbnailPanel =
			this.sporecastPanelIsActive ?
			this.sporecastPanel :
			this.assetThumbnailsPanel;

		let thumbnails = null;
		let visibleThumbnails = null;

		/* Sleeping to wait for the page to load is the simplest way to avoid
		wacky results. Such as returning too many URLs, and having duplicate
		URLSs, not getting all unique URLs. */

		await sleep(initialPageLoadSleepDuration);

		do
		{
			await sleep(15);

			thumbnails = Array.prototype.filter.call(
				thumbnailPanel.querySelectorAll('*.js-asset-view'),
				(thumbnail) => /^asset-thumbnail-[0-9]+-[0-9]+$/.test(thumbnail.id)
			);

			visibleThumbnails =
				thumbnails.filter((thumb) => !isElementHidden(thumb));
		}
		while (
			visibleThumbnails.length === 0 ||
			visibleThumbnails.filter((thumb) => !isImageLoaded(thumb)).length != 0
		)
		/* If there are no visible thumbnails, then the we've only just
		navigated to the page, so we still need to wait for the page to
		load, no valid page should have zero visible thumbnails, so we
		should be safe to infinitely sleep. */

		return visibleThumbnails;
	}

	static getAssetThumbnailImage (assetThumbnailElement)
	{
		return assetThumbnailElement.querySelector('img.js-asset-thumbnail');
	}

	static getAssetThumbnailImages (assetThumbnailElements)
	{
		return Array.prototype.map.call(
			assetThumbnailElements,
			(thumbnail) => AssetThumbnailsPanel.getAssetThumbnailImage(thumbnail)
		);
	}
}

function getSelectedOptionValue (selectElement)
{
	return selectElement.options[selectElement.selectedIndex].value;
}

class UserControls
{
	containerNode;
	assetThumbnailsPanel;
	applyTo;
	initialPageLoadSleepDuration;
	operationGetImageUrlsButton;
	operationDownloadImages;
	outputTextArea;

	constructor ()
	{
		this.containerNode = ifNullThrow(
			document.getElementById('content-left-column'),
			'Could not find sidebar.'
		);

		this.assetThumbnailsPanel = new AssetThumbnailsPanel();
	}

	inject ()
	{
		const htmlToInject =
		`
			<section id="duc-injected-controls">
				<header><h2>Download User Creations</h2></header>

				<label for="duc-apply-to">Apply to</label>
				<select id="duc-apply-to">
					<option value="currentPage" selected="selected">Current Page</option>
					<option value="allPages">All Pages</option>
					<option value="allFollowingPages">Current and All Following Pages</option>
					<option value="allPreviousPages">Current and All Previous Pages</option>
				</select>

				<label for="duc-initial-page-load-delay">Initial Page Load Sleep Duration (Milliseconds)</label>
				<input id="duc-initial-page-load-delay" value="600" min="1" max="300000" step="1" type="number"></input>

				<button id="duc-operation-get-image-urls" type="button">Get User Creation Image URLs</button>
				<button id="duc-operation-download-images" type="button">Download User Creation Image Files</button>

				<div id="duc-output-area">
					<textarea id="duc-output-textarea" readonly="readonly"></textarea>
				</div>
			<section>
		`;

		this.containerNode.insertAdjacentHTML('afterbegin', htmlToInject);
		this.operationGetImageUrlsButton = document.getElementById('duc-operation-get-image-urls');
		this.operationDownloadImages = document.getElementById('duc-operation-download-images');
		this.outputTextArea = document.getElementById('duc-output-textarea');
		this.applyTo = document.getElementById('duc-apply-to');
		this.initialPageLoadSleepDuration = document.getElementById('duc-initial-page-load-delay');
	}

	clearOutput ()
	{
		this.outputTextArea.textContent = '';
	}

	parseinitialPageLoadSleepDuration ()
	{
		return parseInt(this.initialPageLoadSleepDuration.value);
	}
}

function lookupKeyWithFallback (objectToLookup, key, fallback)
{
	const lookupResult = objectToLookup[key];

	if (lookupResult == null)
	{
		return fallback;
	}

	return lookupResult;
}


/* The abstractions started to leak around here and I couldn't be bothered to
mop them up. Sorry. */

async function invokeOperation (userControls, operationCallback)
{
	userControls.clearOutput();

	const assetThumbnailsPanel = userControls.assetThumbnailsPanel;

	let currentApplyTo = getSelectedOptionValue(userControls.applyTo);
	if (currentApplyTo === 'allPages')
	{
		while (assetThumbnailsPanel.moveToPreviousPage())
		{}
		currentApplyTo = 'allFollowingPages';
	}

	const loopPredicate = lookupKeyWithFallback(
		{
			'allFollowingPages': function () {return assetThumbnailsPanel.moveToNextPage();},
			'allPreviousPages': function () {return assetThumbnailsPanel.moveToPreviousPage();}
		},
		currentApplyTo,
		function () {return false;}
	);

	do
	{
		await operationCallback(userControls);
	}
	while(loopPredicate())
}

function getImageURLs (assetThumbnails)
{
	return AssetThumbnailsPanel.getAssetThumbnailImages(assetThumbnails).
		map((img) => img.src);
}

async function getImageURLsCallback (userControls)
{
	const thumbnails = await userControls.assetThumbnailsPanel.getAssetThumbnails(
		userControls.parseinitialPageLoadSleepDuration()
	);
	const urls = getImageURLs(thumbnails);

	userControls.outputTextArea.textContent += urls.join('\n') + '\n';
}

async function downloadImagesCallback (userControls)
{
	const thumbnails = await userControls.assetThumbnailsPanel.getAssetThumbnails(
		userControls.parseinitialPageLoadSleepDuration()
	);
	const urls = getImageURLs(thumbnails);

	if (typeof GM_download == 'undefined')
	{
		window.alert('This operation requires Violentmonkey (tested) or Tampermonkey (not tested).');
		return null;
	}

	for (const url of urls)
	{
		const urlSegments = splitPath(url);
		const filename = urlSegments[urlSegments.length - 1];

		GM_download(url, filename);
	}
}

async function main ()
{
	const controls = new UserControls();
	controls.inject();

	controls.operationGetImageUrlsButton.addEventListener(
		'click',
		async function ()
		{
			await invokeOperation(controls, getImageURLsCallback);
		}
	);

	controls.operationDownloadImages.addEventListener(
		'click',
		async function ()
		{
			await invokeOperation(controls, downloadImagesCallback);
		}
	);
}

main();
