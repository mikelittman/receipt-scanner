import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs"; // import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

export class ReceiptScannerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "ReceiptsBucket", {
      bucketName: "receipt-scanner-analysis-bucket",
    });

    const translationJobRole = new Role(this, "TranslationJobRole", {
      assumedBy: new ServicePrincipal("translate.amazonaws.com"),
    });

    // Add inline policy for S3 access
    translationJobRole.addToPolicy(
      new PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
      })
    );

    // Add inline policy for StartTextTranslationJob
    translationJobRole.addToPolicy(
      new PolicyStatement({
        actions: ["translate:StartTextTranslationJob"],
        resources: ["*"], // You can specify specific resources if needed
      })
    );

    // output role arn
    new CfnOutput(this, "TranslationJobRoleArn", {
      value: translationJobRole.roleArn,
    });
  }
}
