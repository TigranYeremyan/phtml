import Node from './Node';

/**
* @name Doctype
* @class
* @extends Node
* @classdesc Create a new {@link Doctype} {@link Node}.
* @param {Object|String} settings - Custom settings applied to the {@link Doctype}, or the name of the {@link Doctype}.
* @param {String} settings.name - Name of the {@link Doctype}.
* @param {String} settings.publicId - Public identifier portion of the {@link Doctype}.
* @param {String} settings.systemId - System identifier portion of the {@link Doctype}.
* @param {Object} settings.source - Source mapping of the {@link Doctype}.
* @returns {Doctype}
* @example
* new Doctype({ name: 'html' }) // <!doctype html>
*/
class Doctype extends Node {
	constructor (settings) {
		super();

		if (typeof settings === 'string') {
			settings = { name: settings };
		}

		Object.assign(this, {
			type: 'doctype',
			doctype: String(Object(settings).doctype || 'doctype'),
			name: String(Object(settings).name || 'html'),
			publicId: Object(settings).publicId || null,
			systemId: Object(settings).systemId || null,
			source: Object.assign({
				before: Object(Object(settings).source).before || ' ',
				after: Object(Object(settings).source).after || '',
				beforePublicId: Object(Object(settings).source).beforePublicId || null,
				beforeSystemId: Object(Object(settings).source).beforeSystemId || null
			}, Object(settings).source)
		});
	}

	/**
	* Return a clone of the current {@link Doctype}.
	* @param {Object} settings - Custom settings applied to the cloned {@link Doctype}.
	* @returns {Doctype} - The cloned {@link Doctype}
	* @example
	* doctype.clone()
	* @example <caption>Clone the current text with new source.</caption>
	* doctype.clone({ source: { input: 'modified source' } })
	*/
	clone (settings) {
		return new this.constructor(Object.assign({}, this, settings, {
			source: Object.assign({}, this.source, Object(settings).source)
		}));
	}

	/**
	* Return the current {@link Doctype} as a String.
	* @returns {String}
	*/
	toString () {
		const publicId = this.publicId ? `${this.source.beforePublicId || ' '}${this.publicId}` : '';
		const systemId = this.systemId ? `${this.source.beforeSystemId || ' '}${this.systemId}` : '';

		return `<!${this.doctype}${this.source.before}${this.name}${this.source.after}${publicId}${systemId}>`;
	}

	/**
	* Return the current {@link Doctype} as an Object.
	* @returns {Object}
	*/
	toJSON () {
		return {
			name: this.name,
			publicId: this.publicId,
			systemId: this.systemId
		};
	}
}

export default Doctype;
