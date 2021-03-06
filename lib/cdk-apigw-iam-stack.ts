import * as cdk from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as iam from "@aws-cdk/aws-iam";

export class CdkApigwIamStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const auth_iamrolearn = cdk.Fn.importValue(this.node.tryGetContext('cognito_idpool_auth_iamrolearn_exportname'))
    const auth_iamrole = iam.Role.fromRoleArn(this, 'auth_iamrole', auth_iamrolearn)

    const restapi = new apigateway.RestApi(this, 'api', {
      restApiName: id,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowCredentials: true,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS
      }
    })
    
    const integration = new apigateway.MockIntegration({
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': JSON.stringify({
          statusCode: 200
        })
      },
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({
            ip: "$context.identity.sourceIp"
          })
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'c98.figmentresearch.com'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
          'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST,GET'",
          'method.response.header.Access-Control-Allow-Credentials': "'true'",
          //'method.response.header.Content-Type': "'application/json'",
        }
      }]
    })
    
    const items = restapi.root.addResource('items');
    
    const method = items.addMethod('GET', integration, {
      authorizationType: apigateway.AuthorizationType.IAM,
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': new apigateway.EmptyModel()
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
          //'method.response.header.Content-Type': true,
        }
      }]}
    )

    const api_policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "execute-api:Invoke"
      ],
      resources: [ 
        method.methodArn
      ]
    })

    auth_iamrole.attachInlinePolicy(new iam.Policy(this, 'AuthPolicy', {
      statements: [
        api_policy
      ]
    }))
    
    new cdk.CfnOutput(this, 'output', {
      value: restapi.url
    })
    
    new cdk.CfnOutput(this, 'methodArn', {
      value: method.methodArn
    })
  }
}
