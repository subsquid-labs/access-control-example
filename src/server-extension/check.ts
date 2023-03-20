import {RequestCheckContext} from '../../node_modules/@subsquid/graphql-server/src/check'
import jwt from 'jsonwebtoken'

function authorizeUser(user: string | undefined, requestedOperations: (string | undefined)[]): boolean {
	let selectionsAuthorizedForBob = new Set([
		'liquidationEventById',
		'squidStatus'
	])

	switch(user) {
		case 'Alice':
			return true
		case 'Bob':
			return requestedOperations.every(o => o && selectionsAuthorizedForBob.has(o))
		default:
			return false
	}
}

export async function requestCheck(req: RequestCheckContext): Promise<boolean | string> {
	// Extract a token from the HTTP Authorization header
	let token: string | undefined = req.http.headers.get('authorization')?.split(' ')[1]
	if(token) {
		// A key for verifying the authenticity of the JWT signature.
		// Can be a secret symmetric key or a public key.
		let secretKey = 'mySecretKey'

		try {
			let decoded = jwt.verify(token, secretKey)
			let user = decoded.sub?.toString()
			let requestedOperations = req.operation.selectionSet.selections.map(s => s.loc?.startToken.value)
			return authorizeUser(user, requestedOperations)
		} catch(err) {
			console.log('Error decoding JWT')
			console.log(err)
		}
	}
	return false
}
