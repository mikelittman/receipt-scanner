# Receipt Scanner

## Demo Video

![](./demo-video.mov)

## Requirements

### Services and ENVs

See the [`.env.example`](./.env.example) file for the necessary environment variables.

See the [`stack/.env.example](./stack/.env.example) file for necessary deployment environment variables.

> This step will produce an ARN that must be used in the top level `.env`


### To run

- docker
- openai api keys
- aws credentials
- stack deployment: `pnpm cdk deploy`

### To develop

- node@20
- pnpm
- mongo atlas


## Design choices

I chose Next.js for front-end development as it's an opinionated React framework that allows rapid building of high-quality web applications. The entire solution outside of third-party APIs called is in written in TypeScript targeting Node.js

Next.js is also responsible for hosting the API routes necessary to upload files and query them. MongoDB Atlas was used as I wasn't as familiar with Vector Databases but have worked with Mongo in the past. It appears to provide an effective solution for querying embeddings.

I chose to use OpenAI's GPT-4o model as it's shown effective reasoning capabilities, is the most recent in terms of GPT models released, and has a great cost model for this use-case.

For document ingestion and translation, AWS Textract and Translate were used. The system will try to use multiple methods to manage this ingestion to handle all file types as well as a wider range of file sizes.

## For the future

Going forward, this would need to be changed in order to support multi-tenancy. I would opt for a file ingestion queue which would allow for processing of multiple files at once that isn't coordinated entirely by the client. There are also some areas of refactoring/cleanup that could be done as there was some exploratory work to stand this up. Finally, some of the UI/UX interactions are less than ideal and more reflect this as a proof-of-concept than a production-ready application.