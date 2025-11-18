// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'

// Complete Voting IDL from anchor_project/target/idl/voting.json
const VOTING_IDL_DATA = {
  address: '68HyhDBMe8rSesE5YMpG1LZuJuL1s24tcC7knd3dHgQc',
  metadata: {
    name: 'voting',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'Voting Program built with Anchor',
  },
  instructions: [
    {
      name: 'close_poll',
      discriminator: [139, 213, 162, 65, 172, 150, 123, 67],
      accounts: [
        { name: 'signer', writable: true, signer: true },
        { name: 'poll', writable: true },
      ],
      args: [],
    },
    {
      name: 'create_poll',
      discriminator: [182, 171, 112, 238, 6, 219, 14, 110],
      accounts: [
        { name: 'creator', writable: true, signer: true },
        { name: 'poll', writable: true },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [
        { name: 'poll_id', type: 'u64' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'start_time', type: 'i64' },
        { name: 'end_time', type: 'i64' },
      ],
    },
    {
      name: 'vote',
      discriminator: [227, 110, 155, 23, 136, 126, 172, 25],
      accounts: [
        { name: 'poll', writable: true },
        { name: 'voter', writable: true },
        { name: 'voter_signer', writable: true, signer: true },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [
        { name: 'poll_id', type: 'u64' },
        { name: 'vote_type', type: 'bool' },
      ],
    },
  ],
  accounts: [
    { name: 'Poll', discriminator: [110, 234, 167, 188, 231, 136, 153, 111] },
    { name: 'Voter', discriminator: [241, 93, 35, 191, 254, 147, 17, 202] },
  ],
  errors: [
    { code: 6000, name: 'AlreadyVoted', msg: 'This voter has already voted on this poll' },
    { code: 6001, name: 'Unauthorized', msg: 'Unauthorized to close this poll' },
    { code: 6002, name: 'InvalidPollTime', msg: 'Invalid poll time settings' },
    { code: 6003, name: 'PollMismatch', msg: 'Poll ID mismatch' },
    { code: 6004, name: 'VotingNotActive', msg: 'Voting is not currently active for this poll' },
    { code: 6005, name: 'PollNotStarted', msg: 'Poll has not started yet' },
    { code: 6006, name: 'PollEnded', msg: 'Poll has already ended' },
    { code: 6007, name: 'PollAlreadyStarted', msg: 'Poll has already started and can only be closed by admin' },
  ],
  types: [
    {
      name: 'Poll',
      type: {
        kind: 'struct',
        fields: [
          { name: 'poll_id', type: 'u64' },
          { name: 'creator', type: 'pubkey' },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'yes_votes', type: 'u32' },
          { name: 'no_votes', type: 'u32' },
          { name: 'created_at', type: 'i64' },
          { name: 'start_time', type: 'i64' },
          { name: 'end_time', type: 'i64' },
        ],
      },
    },
    {
      name: 'Voter',
      type: {
        kind: 'struct',
        fields: [
          { name: 'poll_id', type: 'u64' },
          { name: 'has_voted', type: 'bool' },
        ],
      },
    },
  ],
}

// Re-export IDL
export const VotingIDL = VOTING_IDL_DATA

// The programId is imported from the program IDL.
export const VOTING_PROGRAM_ID = new PublicKey(VOTING_IDL_DATA.address)

// Voting type
export type Voting = any

// This is a helper function to get the Voting Anchor program.
export function getVotingProgram(provider: AnchorProvider, address?: PublicKey): Program<Voting> {
  return new Program({ ...VOTING_IDL_DATA, address: address ? address.toBase58() : VOTING_IDL_DATA.address } as Voting, provider)
}

// This is a helper function to get the program ID for the Voting program depending on the cluster.
export function getVotingProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
      return new PublicKey('68HyhDBMe8rSesE5YMpG1LZuJuL1s24tcC7knd3dHgQc')
    case 'testnet':
      return new PublicKey('68HyhDBMe8rSesE5YMpG1LZuJuL1s24tcC7knd3dHgQc')
    case 'mainnet-beta':
    default:
      return VOTING_PROGRAM_ID
  }
}
