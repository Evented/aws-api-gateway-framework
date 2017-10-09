import fs from 'fs';
import path from 'path';

import { resources as Resources } from './index';
import Method from './Method';

const {
	AWSApiGatewayMethod,
	AWSApiGatewayModel,
	AWSApiGatewayResource,
} = Resources;

const directoryNames = {
	resources: 'Resources',
	models: 'Models',
	routes: 'Routes',
};

const directories = {};

const RestApiId = {
	Ref: 'RestApi',
};
const requiredResources = [
	'RestApi',
	'IamRole',
	'Deployment',
	'Stage',
];

async function collectResources() {
	const resources = {};
	const listings = fs.readdirSync(directories.resources)
		.map(listing => ({
			id: listing.replace(/\..*$/, ''),
			filePath: path.join(directories.resources, listing),
		}))
		.filter(({ filePath }) => fs.statSync(filePath).isFile());

	const missingRequired = requiredResources
		.filter(requiredResource => !listings
			.find(({ id }) => id === requiredResource));

	if (missingRequired.length) {
		throw new Error(`The following resources are required, but missing: ${missingRequired.join(', ')}`);
	}

	for (const { id, filePath } of listings) {
		try {
			const { default: resource } = await import(filePath);
			Object.assign(resources, { [id]: resource });
		} catch (ex) {
			console.error(`Unable to import ${filePath}`);
		}
	}

	return resources;
}

function pascalReplace(str) {
	return str
		.replace(/([{}]|\..*)/g, '')
		.replace(/^./, char => char.toUpperCase());
}

async function collectModels() {
	const resources = {};

	for (const listing of fs.readdirSync(directories.models)) {
		const Name = pascalReplace(listing);

		Object.assign(resources, {
			[`${Name}Model`]: new AWSApiGatewayModel({
				RestApiId,
				ContentType: 'application/json',
				Description: '',
				Name,
				Schema: JSON.stringify(await import(path.join(directories.models, listing))),
			}),
		});
	}

	return resources;
}

const rootParent = {
	'Fn::GetAtt': [
		RestApiId.Ref,
		'RootResourceId',
	],
};

const Integration = Object.freeze({
	Credentials: {
		'Fn::GetAtt': [
			'IamRole',
			'Arn',
		],
	},
	PassthroughBehavior: 'NEVER',
});

const validMethods = Object.freeze([
	'DELETE',
	'HEAD',
	'GET',
	'PATCH',
	'POST',
	'PUT',
]);

function isUnsafeMethod(method) {
	return /^(DELETE|PATCH|POST|PUT)$/.test(method);
}

async function collectRoutes() {
	const resources = {};
	const allMethods = [];
	const resoureMethods = new Map();

	// Gather Routes and Methods
	await (async function walk(dir = []) {
		const dirPath = path.join(directories.routes, ...dir);

		for (const listing of fs.readdirSync(dirPath)) {
			const pathArray = dir.concat(listing);
			const parentName = dir
				.map(pascalReplace)
				.join('');
			const HttpMethod = pascalReplace(listing);
			const resourceName = `${parentName}${HttpMethod}`;
			const parent = parentName ? { Ref: parentName } : rootParent;
			const fullPath = path.join(dirPath, listing);
			const stats = fs.statSync(fullPath);

			if (stats.isDirectory()) {
				Object.assign(resources, {
					[resourceName]: new AWSApiGatewayResource({
						RestApiId,
						ParentId: parent,
						PathPart: listing,
					}),
				});

				resoureMethods.set(resourceName, []);
				await walk(pathArray);
			} else if (stats.isFile()) {
				if (!validMethods.includes(HttpMethod)) {
					console.error(`Invalid file in the Routes directory: ${fullPath}`);
					return;
				}

				const { default: props } = await import(fullPath);

				props.isHead = HttpMethod === 'HEAD';

				const Properties = props.rendered;

				Object.assign(Properties.Integration, Integration);

				Object.assign(resources, {
					[resourceName]: new AWSApiGatewayMethod({
						RestApiId,
						ResourceId: parent,
						AuthorizationType: isUnsafeMethod(HttpMethod) ? 'AWS_IAM' : 'NONE',
						HttpMethod,
						...Properties,
					}),
				});

				allMethods.push(resourceName);

				if (Properties.MethodResponses[0].StatusCode !== '405') { resoureMethods.get(parentName).push(HttpMethod); }
			}
		}
	}());

	// Generate OPTIONS methods
	for (const [resourceId, methods] of resoureMethods.entries()) {
		if (!methods.length) { continue; }

		const HttpMethod = 'OPTIONS';

		methods.push(HttpMethod);
		methods.sort();

		const method = new Method({
			requestTemplate: ['{"statusCode":200}'],
			responses: [
				{
					StatusCode: 200,
					template: '',
					headers: {
						'Access-Control-Allow-Headers': `'${[
							'Content-Type',
							'X-Amz-Date',
							'Authorization',
							'X-Api-Key',
							'X-Amz-Security-Token',
						].join()}'`,
						'Access-Control-Allow-Methods': `'${methods.join()}'`,
					},
					model: 'Empty',
				},
			],
			Type: 'MOCK',
			PassthroughBehavior: 'WHEN_NO_MATCH',
		});

		Object.assign(resources, {
			[`${resourceId}${HttpMethod}`]: new AWSApiGatewayMethod({
				RestApiId,
				ResourceId: {
					Ref: resourceId,
				},
				AuthorizationType: 'NONE',
				HttpMethod,
				...method.rendered,
			}),
		});
	}

	return {
		routes: resources,
		allMethods,
	};
}

async function collectCloudFormation(rootDir) {
	const [
		CloudFormation,
		resources,
		models,
		{
			routes,
			allMethods,
		},
	] = await Promise.all([
		import(`${rootDir}/CloudFormation.json`),
		collectResources(),
		collectModels(),
		collectRoutes(),
	]);

	resources.Deployment.DependsOn = allMethods;

	return Object.assign(CloudFormation, {
		Resources: {
			...resources,
			...models,
			...routes,
		},
	});
}

export async function generate(rootDir, pretty = true) {
	for (const [key, val] of Object.entries(directoryNames)) {
		Object.assign(directories, { [key]: path.join(rootDir, val) });
	}

	const template = await collectCloudFormation(rootDir);
	const output = JSON.stringify(template, null, pretty ? '\t' : '');

	return { template, output };
}

export async function write(rootDir, pretty = true) {
	const time = process.hrtime();

	const { template, output } = await generate(rootDir, pretty);

	fs.writeFileSync(
		path.join(rootDir, 'build', 'CloudFormation.json'),
		output,
	);

	const [seconds, nanoseconds] = process.hrtime(time);
	const milliseconds = ((seconds * 1e9) + nanoseconds) / 1e6;
	console.info(`Finished in: ${milliseconds} ms`);
	console.info(`Output size: ${output.length / 1e3} kb`);
	console.info(`Number of Resources: ${Object.keys(template.Resources).length}`);
}
