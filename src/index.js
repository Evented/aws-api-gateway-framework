let configTemp;

try {
	// eslint-disable-next-line global-require,import/no-unresolved
	configTemp = require('../../../framework-config.js');
} catch (ex) {
	configTemp = {};
}

export const config = configTemp;

export function message(msg) {
	return JSON.stringify({ message: msg });
}

export function LambdaIntegration(LambdaArn) {
	return {
		IntegrationHttpMethod: 'POST',
		Uri: {
			'Fn::Sub': [
				// eslint-disable-next-line no-template-curly-in-string
				'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations',
				{
					LambdaArn,
				},
			],
		},
	};
}

export function DynamoDBIntegration(action) {
	return {
		IntegrationHttpMethod: 'POST',
		Uri: {
			'Fn::Sub': `arn:aws:apigateway:\${AWS::Region}:dynamodb:action/${action}`,
		},
	};
}

export * from './CloudFormation/index';
