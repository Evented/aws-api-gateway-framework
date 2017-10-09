# AWS API Gateway Framework

> A framework for creating RESTful AWS API Gateway APIs with AWS CloudFormation

### Status
* Master: [![CircleCI](https://circleci.com/gh/Evented/aws-api-gateway-framework/tree/master.svg?style=svg)](https://circleci.com/gh/Evented/aws-api-gateway-framework/tree/master)
* Develop: [![CircleCI](https://circleci.com/gh/Evented/aws-api-gateway-framework/tree/develop.svg?style=svg)](https://circleci.com/gh/Evented/aws-api-gateway-framework/tree/develop)

## Intro

**This project is currently an early alpha. Features and documentation may be incomplete. Many things will likely change.**

If you've ever wanted to build a REST API with [AWS API Gateway](https://aws.amazon.com/api-gateway/), it can be difficult to manage multiple resources (AKA routes or endpoints), if you want them to go to different back-ends. For example, you may have one route that is handled by AWS Lambda, one that goes directly to DynamoDB, and another that goes to a webserver running on ECS. In this case, you would need to define three different resources, manage all of the methods within that resource. As your API grows, the size of your CloudFormation template will grow with it. This can be problematic as your CloudFormation template will inevitably grow exponentially. This framework attempts to reduce the burden of managing the resources and methods in your API by using a directory structure to mirror the resources and using JavaScript modules to define the methods.

## Features
* Define your APIs as JavaScript modules
* An opinionated directory structure for defining routes
* Exports to an AWS CloudFormation template
* Automatically generates OPTIONS methods
* Minimizes boilerplate
* Testing APIs

## TODO
* [ ] Tests
* [x] Set up CI
* [ ] Implement a CLI tool
* [ ] Provide an  example implementation
