const fonttools = require('fonttools');
const xml = require('xml2js');

const {promisify} = require('util');

const xmlBuilder = new xml.Builder();
const xmlParser = new xml.Parser();
const parseXml = promisify(xmlParser.parseString);

let fonttoolsInstance;

const DEFAULT_LINESPACE_FACTOR = 10;

function normalizeFontTables(tableOS2, tableHhea, tableHead, linespaceFactor) {
	let os2WinAsc, os2WinDesc;

	let os2TypoAsc = parseInt(tableOS2.sTypoAscender[0].$.value, 10);
	let os2TypoDesc = parseInt(tableOS2.sTypoDescender[0].$.value, 10);
	let os2TypoLineGap = parseInt(tableOS2.sTypoLineGap[0].$.value, 10);
	let hheaAsc = parseInt(tableHhea.ascent[0].$.value, 10);
	let hheaDesc = parseInt(tableHhea.descent[0].$.value, 10);
	const UPM = parseInt(tableHead.unitsPerEm[0].$.value, 10);

	const os2TypoAscDescDelta = os2TypoAsc + Math.abs(os2TypoDesc);
	const hheaAscDescDelta = hheaAsc + Math.abs(hheaDesc);

	const factor = linespaceFactor / 100;

	const lineSpacingUnits = Math.round(factor * UPM);
	const totalHeight = lineSpacingUnits + UPM;

	const deltaHeight = totalHeight - hheaAscDescDelta;
	const upperLowerAddUnits = Math.round(deltaHeight / 2);

	const hheaLineGap = 0;

	const isVerticalMetricsMatchGoogleApproachCondition = (os2TypoLineGap === 0 && os2TypoAscDescDelta > UPM);
	const isVerticalMetricsMatchAdobeApproachCondition = (os2TypoLineGap === 0 && os2TypoAscDescDelta === UPM);

	if (isVerticalMetricsMatchGoogleApproachCondition) {
		os2TypoAsc = os2TypoAsc + upperLowerAddUnits;
		os2TypoDesc = os2TypoDesc - upperLowerAddUnits;
		hheaAsc = hheaAsc + upperLowerAddUnits;
		hheaDesc = hheaDesc - upperLowerAddUnits;
		os2WinAsc = hheaAsc;
		os2WinDesc = -hheaDesc;
	} else if (isVerticalMetricsMatchAdobeApproachCondition) {
		hheaAsc = hheaAsc + upperLowerAddUnits;
		hheaDesc = hheaDesc - upperLowerAddUnits;
		os2WinAsc = hheaAsc;
		os2WinDesc = -hheaDesc;
	} else {
		os2TypoLineGap = lineSpacingUnits;
		hheaAsc = Math.round(os2TypoAsc + (os2TypoLineGap / 2));
		hheaDesc = -1 * (totalHeight - hheaAsc);
		os2WinAsc = hheaAsc;
		os2WinDesc = -hheaDesc;
	}

	tableOS2.sTypoAscender[0].$.value = '' + os2TypoAsc;
	tableOS2.sTypoDescender[0].$.value = '' + os2TypoDesc;
	tableOS2.sTypoLineGap[0].$.value = '' + os2TypoLineGap;
	tableOS2.usWinAscent[0].$.value = '' + os2WinAsc;
	tableOS2.usWinDescent[0].$.value = '' + os2WinDesc;

	tableHhea.ascent[0].$.value = '' + hheaAsc;
	tableHhea.descent[0].$.value = '' + hheaDesc;
	tableHhea.lineGap[0].$.value = '' + hheaLineGap;
}

function fixFontVerticalMetrics(font, linespaceFactor) {
	const rootKey = Object.keys(font)[0];
	if (font[rootKey]) {
		const tableOS2 = font[rootKey]['OS_2'][0];
		const tableHhea = font[rootKey]['hhea'][0];
		const tableHead = font[rootKey]['head'][0];
		if (tableOS2 && tableHhea && tableHead) {
			normalizeFontTables(tableOS2, tableHhea, tableHead, linespaceFactor);
		}
	}
	return font;
}

function bufferToFontObject(fontBuffer) {
	const fontXmlBuffer = fonttoolsInstance.decompile(fontBuffer);
	return parseXml(fontXmlBuffer.toString('utf8'));
}

function fontObjectToBuffer(fontObj) {
	const newFontXml = xmlBuilder.buildObject(fontObj);
	const newFontXmlBuffer = new Buffer(newFontXml);
	return fonttoolsInstance.compile(newFontXmlBuffer);
}

async function main(fontBuffer, linespaceFactor = DEFAULT_LINESPACE_FACTOR) {
	if (!Buffer.isBuffer(fontBuffer)) {
		throw new Error('First parameter must be a buffer !');
	}

	if (!(Number.isInteger(linespaceFactor) && linespaceFactor >= 1)) {
		throw new Error('Second parameter must be an integer value greater or equal 1 !');
	}

	const fontObject = await bufferToFontObject(fontBuffer);
	fixFontVerticalMetrics(fontObject, linespaceFactor);
	return fontObjectToBuffer(fontObject);
}

module.exports = (fonttoolsLibPath) => {
	fonttoolsInstance = fonttoolsLibPath
		? fonttools.default(fonttoolsLibPath)
		: fonttools.default();

	return main;
};