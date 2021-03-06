import { minify, emptyTemplate } from './velocity-tools';

function formatVariable(type, name, length) {
	let setter;
	let condition;

	switch (type) {
	case 'cognitoId':
		setter = `$util.urlDecode($input.params('${name}'))`;
		condition = `!$${name}.matches('^[a-z]{2}-[a-z]{4,9}-\\d:[\\da-f]{4}([\\da-f]{4}-){4}[\\da-f]{12}$')`;
		break;
	case 'uuid':
		setter = `$input.params('${name}').replace('-', '+').replace('_', '/') + '=='`;
		condition = `!$${name}.matches('^[A-Za-z\\d+/]{22}==$')`;
		break;
	case 'string':
		setter = `$input.path('$.${name}')`;
		condition = `$${name}.getClass().getName() != 'java.lang.String' || $${name}.length() > ${length}`;
		break;
	default:
	}

	return minify(`
		#set( $${name} = ${setter} )
		#if( ${condition} )
			#set( $${name} = '' )
		#end
	`);
}

function quote(string) {
	return `'${string}'`;
}

/**
 *
 * @param items {!Array}
 * @param items[].StatusCode {!integer}
 * @param items[].headers {object}
 * @param items[].template {!string}
 * @param items[].model {!string}
 * @param isHead {!boolean}
 * @returns {{IntegrationResponses: Array, MethodResponses: Array}}
 */
function generateResponses(items, isHead = false) {
	const IntegrationResponses = [];
	const MethodResponses = [];

	for (const {
		StatusCode: statusCodeNumber, template, headers = {}, SelectionPattern, model,
	} of items) {
		const StatusCode = statusCodeNumber.toString();

		const integration = {
			StatusCode,
			ResponseParameters: {},
			ResponseTemplates: {
				'application/json': isHead ? emptyTemplate : template,
			},
		};

		const filteredHeaders = Object
			.keys(headers)
			.filter(header => !/^Access-Control-/.test(header));

		headers['Access-Control-Allow-Origin'] = quote('*');

		if (filteredHeaders.length) {
			headers['Access-Control-Expose-Headers'] = quote(filteredHeaders.join());
		}

		for (const [key, val] of Object.entries(headers)) {
			integration.ResponseParameters[`method.response.header.${key}`] = val;
		}

		if (SelectionPattern) { Object.assign(integration, { SelectionPattern }); }

		IntegrationResponses.push(integration);

		const methodResponse = {
			StatusCode,
			ResponseParameters: {},
			ResponseModels: {
				'application/json': isHead ? 'Empty' : model || 'Error',
			},
		};

		for (const parameter of Object.keys(integration.ResponseParameters)) {
			methodResponse.ResponseParameters[parameter] = true;
		}

		MethodResponses.push(methodResponse);
	}

	return {
		IntegrationResponses,
		MethodResponses,
	};
}

/**
 *
 * @param args {(string|array|object)[]}
 * @returns {object}
 */
function formatRequestTemplates(args) {
	return {
		'application/json': minify(args.map((arg) => {
			if (Array.isArray(arg)) { return formatVariable(...arg); } else if (typeof arg === 'object') { return JSON.stringify(arg); }

			return arg;
		}).join('')),
	};
}

/**
 *
 * @param model {!string}
 * @returns {*}
 */
function formatModel(model) {
	if (!model) { return undefined; }

	return {
		'application/json': {
			Ref: `${model}Model`,
		},
	};
}

export default class {
	raw = {};

	constructor(params) {
		this.raw = params;
	}

	get rendered() {
		const {
			IntegrationHttpMethod,
			Uri,
			requestTemplate,
			responses,
			Type = 'AWS',
			PassthroughBehavior,
			model,
		} = this.raw;

		const { IntegrationResponses, MethodResponses } = generateResponses(responses, this.isHead);

		return {
			Integration: {
				IntegrationHttpMethod,
				IntegrationResponses,
				PassthroughBehavior,
				RequestTemplates: formatRequestTemplates(requestTemplate),
				Type,
				Uri,
			},
			MethodResponses,
			RequestModels: formatModel(model),
		};
	}
}
