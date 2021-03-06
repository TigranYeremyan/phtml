import normalize from './normalize';
import parseHTML from './parseHTML';
import treeAdapter from './parseHTMLTreeAdapter';
import Comment from './Comment';
import Doctype from './Doctype';
import Element from './Element';
import Fragment from './Fragment';
import Text from './Text';
import visit, { getVisitors } from './visit';

/**
* @name Result
* @class
* @classdesc Create a new syntax tree {@link Result} from a processed input.
* @param {Object} processOptions - Custom settings applied to the {@link Result}.
* @param {String} processOptions.from - Source input location.
* @param {String} processOptions.to - Destination output location.
* @param {Array} processOptions.voidElements - Void elements.
* @returns {Result}
* @property {Result} result - Result of pHTML transformations.
* @property {String} result.from - Path to the HTML source file. You should always set from, because it is used in source map generation and syntax error messages.
* @property {String} result.to - Path to the HTML output file.
* @property {Fragment} result.root - Object representing the parsed nodes of the HTML file.
* @property {Array} result.messages - List of the messages gathered during transformations.
* @property {Array} result.voidElements - List of the elements that only have a start tag, as they cannot have any content.
*/
class Result {
	constructor (html, processOptions) {
		// the "to" and "from" locations are always string values
		const from = 'from' in Object(processOptions) && processOptions.from !== undefined && processOptions.from !== null
			? String(processOptions.from)
		: '';
		const to = 'to' in Object(processOptions) && processOptions.to !== undefined && processOptions.to !== null
			? String(processOptions.to)
		: from;
		const voidElements = 'voidElements' in Object(processOptions)
			? [].concat(Object(processOptions).voidElements || [])
		: Result.voidElements;

		// prepare visitors (which may be functions or visitors)
		const visitors = getVisitors(Object(processOptions).visitors);

		// prepare the result object
		Object.assign(this, {
			type: 'result',
			from,
			to,
			input: { html, from, to },
			root: null,
			voidElements,
			visitors,
			messages: []
		});

		// parse the html and transform it into nodes
		const documentFragment = parseHTML(html, { voidElements });

		this.root = transform(documentFragment, this);
	}

	/**
	* Current {@link Root} as a String.
	* @returns {String}
	*/
	get html () {
		return String(this.root);
	}

	/**
	* Messages that are warnings.
	* @returns {String}
	*/
	get warnings () {
		return this.messages.filter(message => Object(message).type === 'warning');
	}

	/**
	* Return a normalized node whose instances match the current {@link Result}.
	* @param {Node} [node] - the node to be normalized.
	* @returns {Node}
	* @example
	* result.normalize(someNode)
	*/
	normalize (node) {
		return normalize(node);
	}

	/**
	* The current {@link Root} as an Object.
	* @returns {Object}
	*/
	toJSON () {
		return this.root.toJSON();
	}

	/**
	* Transform the current {@link Node} and any descendants using visitors.
	* @param {Node} node - The {@link Node} to be visited.
	* @param {Object} [overrideVisitors] - Alternative visitors to be used in place of {@link Result} visitors.
	* @returns {ResultPromise}
	* @example
	* await result.visit(someNode)
	* @example
	* await result.visit() // visit using the root of the current result
	* @example
	* await result.visit(root, {
	*   Element () {
	*     // do something to an element
	*   }
	* })
	*/
	visit (node, overrideVisitors) {
		const nodeToUse = 0 in arguments ? node : this.root;

		return visit(nodeToUse, this, overrideVisitors);
	}

	/**
	* Add a warning to the current {@link Root}.
	* @param {String} text - The message being sent as the warning.
	* @param {Object} [opts] - Additional information about the warning.
	* @example
	* result.warn('Something went wrong')
	* @example
	* result.warn('Something went wrong', {
	*   node: someNode,
	*   plugin: somePlugin
	* })
	*/
	warn (text, rawopts) {
		const opts = Object(rawopts);

		if (!opts.plugin) {
			if (Object(this.currentPlugin).name) {
				opts.plugin = this.currentPlugin.name
			}
		}

		this.messages.push({ type: 'warning', text, opts });
	}

	static voidElements = [
		'area',
		'base',
		'br',
		'col',
		'command',
		'embed',
		'hr',
		'img',
		'input',
		'keygen',
		'link',
		'meta',
		'param',
		'source',
		'track',
		'wbr'
	];
}

function transform (node, result) {
	const hasSource = node.sourceCodeLocation === Object(node.sourceCodeLocation);
	const source = hasSource
		? {
			startOffset: node.sourceCodeLocation.startOffset,
			endOffset: node.sourceCodeLocation.endOffset,
			startInnerOffset: Object(node.sourceCodeLocation.startTag).endOffset || node.sourceCodeLocation.startOffset,
			endInnerOffset: Object(node.sourceCodeLocation.endTag).startOffset || node.sourceCodeLocation.endOffset,
			input: result.input
		}
	: {
		startOffset: 0,
		startInnerOffset: 0,
		endInnerOffset: result.input.html.length,
		endOffset: result.input.html.length,
		input: result.input
	};

	if (Object(node.sourceCodeLocation).startTag) {
		source.before = result.input.html.slice(source.startOffset, source.startInnerOffset - 1).match(/\s*\/?$/)[0]
	}

	if (Object(node.sourceCodeLocation).endTag) {
		source.after = result.input.html.slice(source.endInnerOffset + 2 + node.nodeName.length, source.endOffset - 1)
	}

	const $node = treeAdapter.isCommentNode(node)
		? new Comment({ comment: node.data, source, result })
	: treeAdapter.isDocumentTypeNode(node)
		? new Doctype(Object.assign(node, { result, source: Object.assign({}, node.source, source) }))
	: treeAdapter.isElementNode(node)
		? new Element({
			name: result.input.html.slice(source.startOffset + 1, source.startOffset + 1 + node.nodeName.length),
			attrs: node.attrs.map(attr => attr.raw),
			nodes: node.childNodes instanceof Array ? node.childNodes.map(child => transform(child, result)) : null,
			isSelfClosing: /\//.test(source.before),
			isWithoutEndTag: !Object(node.sourceCodeLocation).endTag,
			isVoid: result.voidElements.includes(node.tagName),
			result,
			source
		})
	: treeAdapter.isTextNode(node)
		? new Text({
			data: hasSource ? source.input.html.slice(
				source.startInnerOffset,
				source.endInnerOffset
			) : node.value,
			result,
			source
		})
	: new Fragment({
		nodes: node.childNodes instanceof Array ? node.childNodes.map(child => transform(child, result)) : null,
		result,
		source
	});

	return $node;
}

export default Result;

/**
* A promise to return a syntax tree.
* @typedef {Promise} ResultPromise
* @example
* resultPromise.then(result => {
*  // do something with the result
* })
*/

/**
* A promise to return a syntax tree.
* @typedef {Object} ProcessOptions
* @property {Object} ProcessOptions - Custom settings applied to the {@link Result}.
* @property {String} ProcessOptions.from - Source input location.
* @property {String} ProcessOptions.to - Destination output location.
* @property {Array} ProcessOptions.voidElements - Void elements.
*/
