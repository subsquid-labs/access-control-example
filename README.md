# Minimalistic access control for Subsquid's GraphQL

**Disclaimer: the code in this repository is provided purely for illustrative properties and is not in any way guaranteed to be secure by Subsquid. Only use it if you know what you're doing.**

This example illustrates how basic authentication and authorization can be built into [Subsquid](https://subsquid.io)'s [GraphQL server](https://docs.subsquid.io/graphql-api/). Two users, Alice and Bob, are authenticated using [JSON Web tokens](https://jwt.io) and authorized to perform different root-level GraphQL selections.

The underlying data comes from a blockchain indexer, or a "squid" in Subsquid terms. It describes `LiquidationCall` events emitted by the [AAVE V2 Lending Pool contract](https://etherscan.io/address/0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9) on Ethereum mainnet. Alice can use the [full set of supported queries](https://docs.subsquid.io/graphql-api/overview/#supported-queries), while Bob can only perform `liquidationEventById` and `squidStatus` queries. 

Dependencies: NodeJS, Docker, cURL.

## Starting the squid

Begin by spinning up a *processor*, a process that ingests the data from the Ethereum Archive:

```bash
$ git clone https://github.com/subsquid-labs/access-control-example
$ cd access-control-example/
$ npm i
$ sqd build
$ sqd up # starts a Postgres database in a Docker container
$ sqd process # begins data ingestion and blocks the terminal
```

Then start the GraphQL server in a separate terminal:

```bash
$ sqd serve
```
The server begins to listen at `localhost:4350`. You can verify that by running:
```bash
$ curl -X POST http://localhost:4350/graphql \
-H 'Content-Type: application/json' \
-d '{"query":"query MyQuery {squidStatus{height}}"}'
```
The server does not allow any queries from unauthorized users, so the output should be
```bash
{"errors":[{"message":"not allowed"}]}
```

## Tokens

The JWT tokens that Alice and Bob are [signed](https://jwt.io/#debugger-io) with a symmetric secret key `mySecretKey` using the HS256 algirithm. The only information they encode are the names of the users stored in the [standard](https://www.rfc-editor.org/rfc/rfc7519#section-4.1) `"sub"` field:
```
{"sub": "Alice"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJBbGljZSJ9.3r0K4FQQY_ghhPp48USw1gJQs1WbaPNt3BCv2EaNnlY
{"sub": "Bob"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCb2IifQ.xdRJEld71Xx7RRn_fHzErShIqMx9Gf1cAV2al1FBH24
```

## Testing authorization

Alice can perform any queries. For example, a `liquidationEvents` query:
```bash
$ curl -X POST http://localhost:4350/graphql \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJBbGljZSJ9.3r0K4FQQY_ghhPp48USw1gJQs1WbaPNt3BCv2EaNnlY' \
-d '{"query":"query MyQuery {liquidationEvents(limit: 3) {liquidator user}}"}'
```
will return a list of events:
```bash
{"data":{"liquidationEvents":[{"liquidator":"0x7a512A3Cf68df453eC76D487E3eaFFECD74d6887","user":"0xA53Fe221Bd861F75907d8Fd496DB1c70779721aA"},{"liquidator":"0x08B5cAbC97B3e4fEF88d8f2Ccb0442a669E052f8","user":"0x9A90AFFD5Fd50561A98a6Fb4358F941a131Ac592"},{"liquidator":"0x7a512A3Cf68df453eC76D487E3eaFFECD74d6887","user":"0x9A90AFFD5Fd50561A98a6Fb4358F941a131Ac592"}]}}
```

Bob cannot perform `liquidationEvents` queries. A request
```bash
$ curl -X POST http://localhost:4350/graphql \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCb2IifQ.xdRJEld71Xx7RRn_fHzErShIqMx9Gf1cAV2al1FBH24' \
-d '{"query":"query MyQuery {liquidationEvents(limit: 3) {liquidator user}}"}'
```
yields
```bash
{"errors":[{"message":"not allowed"}]}
```

However, `liquidationEventById` and `squidStatus` queries by Bob work fine.
```bash
$ curl -X POST http://localhost:4350/graphql \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCb2IifQ.xdRJEld71Xx7RRn_fHzErShIqMx9Gf1cAV2al1FBH24' \
-d '{"query":"query MyQuery {liquidationEventById(id:\"0011471171-000056-e8ce8\"){liquidator user} squidStatus{height}}"}'
```
outputs
```bash
{"data":{"liquidationEventById":{"liquidator":"0x7a512A3Cf68df453eC76D487E3eaFFECD74d6887","user":"0xA53Fe221Bd861F75907d8Fd496DB1c70779721aA"},"squidStatus":{"height":16870285}}}

```

## Using authentication data in custom resolvers

To illustrate this functionality I added [custom queries](https://docs.subsquid.io/graphql-api/custom-resolvers/) (see `src/server-extension/resolvers.ts`) that allow users to leave comments and see how many comments they've made so far. Here's an example of Bob adding a new comment:
```bash
$ curl -X POST http://localhost:4350/graphql \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCb2IifQ.xdRJEld71Xx7RRn_fHzErShIqMx9Gf1cAV2al1FBH24' \
-d '{"query":"mutation {addComment(text: \"bobs text\")}"}'
```
After that, Bob can see that he has one comment: executing
```bash
$ curl -X POST http://localhost:4350/graphql \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCb2IifQ.xdRJEld71Xx7RRn_fHzErShIqMx9Gf1cAV2al1FBH24' \
-d '{"query":"query MyQuery {countUserComments {total}}"}'
```
yields
```
{"data":{"countUserComments":[{"total":1}]}}
```
If Alice subsequently executes the same query, she will see the counter for her own posts:
```bash
$ curl -X POST http://localhost:4350/graphql \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJBbGljZSJ9.3r0K4FQQY_ghhPp48USw1gJQs1WbaPNt3BCv2EaNnlY' \
-d '{"query":"query MyQuery {countUserComments {total}}"}'
```
returns
```
{"data":{"countUserComments":[{"total":0}]}}
```
