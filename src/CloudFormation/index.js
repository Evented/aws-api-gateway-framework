import spec from '@evented/aws-cfn-resource-spec';

const {
	// PropertyTypes,
	// ResourceSpecificationVersion,
	ResourceTypes,
} = spec;

const resources = {};

for (const [Type, { Properties }] of Object.entries(ResourceTypes)) {
	const allowedProperties = new Set(Object.keys(Properties));

	Object.assign(resources, {
		[Type.replace(/:/g, '')]: class {
			constructor(properties) {
				const props = {};

				for (const [key, value] of Object.entries(properties)) {
					if (allowedProperties.has(key)) {
						Object.assign(props, { [key]: value });
					}
				}

				Object.assign(this, {
					Type,
					Properties: props,
				});
			}
		},
	});
}

export { resources }; // eslint-disable-line import/prefer-default-export
