# Voting Program - Solana Anchor Project

A decentralized voting smart contract built with Anchor on Solana, enabling users to create time-based polls and participate in voting with double-vote prevention.

## Overview

This Anchor project implements a voting program that manages polls and voter participation on Solana. The program uses Program Derived Addresses (PDAs) to create deterministic, unique accounts for polls and voter records, ensuring efficient state management and preventing double voting.

**Program ID (Devnet):** `68HyhDBMe8rSesE5YMpG1LZuJuL1s24tcC7knd3dHgQc`

## Tech Stack

- **Anchor Framework 0.31.1** - Solana smart contract development
- **Rust** - Smart contract language
- **Solana Web3** - Blockchain interaction
- **BN.js** - Big number handling

## Project Structure

```
anchor_project/
├── programs/
│   └── voting/
│       ├── src/
│       │   ├── lib.rs           # Main program entry
│       │   ├── instructions/    # Instruction handlers
│       │   │   ├── create_poll.rs
│       │   │   ├── vote.rs
│       │   │   └── mod.rs
│       │   └── state/          # Account state structures
│       │       ├── poll.rs
│       │       ├── voter.rs
│       │       └── mod.rs
│       ├── Cargo.toml
│       └── Xargo.toml
├── tests/
│   └── voting.test.ts          # Integration tests
├── target/                      # Build output
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Workspace config
└── package.json
```

## Getting Started

### Prerequisites

- Rust 1.70+
- Solana CLI tools (latest)
- Anchor CLI (`npm install -g @coral-xyz/anchor`)
- Node.js 18+ and npm

### Installation

```bash
cd anchor_project
npm install
```

### Configuration

Anchor configuration is in `Anchor.toml`. Key settings:

```toml
[programs.devnet]
voting = "68HyhDBMe8rSesE5YMpG1LZuJuL1s24tcC7knd3dHgQc"
```

## Building

Build the program:

```bash
anchor build
```

Output files:
- IDL: `target/idl/voting.json`
- Program: `target/deploy/voting.so`

## Testing

### Prerequisites for Testing

Start a local Solana validator:

```bash
solana-test-validator
```

### Run Tests

```bash
anchor test
```

Test file: `tests/voting.test.ts`

### Test Output

![Test Results](./test-ouput.png)

All tests pass successfully, validating:
- Poll creation with metadata storage
- Vote recording and counting
- Time-based access control
- Double-vote prevention
- Account state management

### Test Coverage

**Happy Path Tests:**
- ✅ Create Poll - Successfully creates poll with metadata
- ✅ Vote Yes - User votes yes during active window
- ✅ Vote No - User votes no during active window
- ✅ Vote Counting - Votes increment correctly

**Unhappy Path Tests:**
- ❌ Double Vote Prevention - User cannot vote twice
- ❌ Voting Before Start - Vote rejected before start time
- ❌ Voting After End - Vote rejected after end time
- ❌ Invalid Poll Time - end_time before start_time rejected
- ❌ Future-only Polls - start_time in past rejected

## Program Instructions

### 1. Create Poll

Initialize a new poll account.

**Parameters:**
- `poll_id` (u64) - Unique poll identifier
- `title` (String) - Poll title (max 200 chars)
- `description` (String) - Poll description (max 500 chars)
- `start_time` (i64) - Unix timestamp for voting start
- `end_time` (i64) - Unix timestamp for voting end

**Constraints:**
- start_time must be in the future
- end_time must be after start_time
- Poll must not already exist

**Example Usage:**
```typescript
await program.methods
  .createPoll(
    pollId,
    "Should we adopt Solana?",
    "Vote on adopting Solana as our blockchain",
    Math.floor(Date.now() / 1000) + 3600,  // Start in 1 hour
    Math.floor(Date.now() / 1000) + 7200   // End in 2 hours
  )
  .accounts({
    poll: pollPda,
    creator: publicKey,
    systemProgram: SystemProgram.programId
  })
  .rpc();
```

### 2. Vote

Cast a vote on an active poll.

**Parameters:**
- `poll_id` (u64) - Which poll to vote on
- `vote` (bool) - true for yes, false for no

**Constraints:**
- Current time must be within voting window
- Voter must not have already voted
- Poll must exist

**Example Usage:**
```typescript
await program.methods
  .vote(pollId, true)  // Vote yes
  .accounts({
    poll: pollPda,
    voter: voterPda,
    authority: publicKey,
    systemProgram: SystemProgram.programId
  })
  .rpc();
```

### 3. Close Poll

Close a poll before it starts (poll creator only).

**Parameters:**
- `poll_id` (u64) - Poll to close

**Constraints:**
- Must be called by poll creator
- Current time must be before poll start time

## Account Structures

### Poll Account

Stores poll metadata and vote counts.

```rust
#[account]
pub struct Poll {
    pub poll_id: u64,           // Unique identifier
    pub creator: Pubkey,        // Creator wallet
    pub title: String,          // Poll title
    pub description: String,    // Poll description
    pub yes_votes: u32,         // Yes vote count
    pub no_votes: u32,          // No vote count
    pub created_at: i64,        // Creation timestamp
    pub start_time: i64,        // Voting start time
    pub end_time: i64,          // Voting end time
}
```

**PDA Seeds:** `["poll", poll_id]`
**Space:** ~1000 bytes (varies by title/description length)

### Voter Account

Tracks whether a user has voted on a poll.

```rust
#[account]
pub struct Voter {
    pub poll_id: u64,           // Which poll
    pub has_voted: bool,        // Vote status
}
```

**PDA Seeds:** `["voter", poll_id, voter_pubkey]`
**Space:** 64 bytes

## PDA Derivation

The frontend can derive account addresses without querying the blockchain:

```typescript
// Poll PDA
const [pollPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("poll"),
    new BN(pollId).toBuffer("le", 8)
  ],
  VOTING_PROGRAM_ID
);

// Voter PDA
const [voterPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("voter"),
    new BN(pollId).toBuffer("le", 8),
    userWallet.toBuffer()
  ],
  VOTING_PROGRAM_ID
);
```

## Deployment

### Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

### Verify Deployment

```bash
solana program show 68HyhDBMe8rSesE5YMpG1LZuJuL1s24tcC7knd3dHgQc --url devnet
```

## Debugging

### View Program Logs

```bash
solana logs 68HyhDBMe8rSesE5YMpG1LZuJuL1s24tcC7knd3dHgQc --url devnet
```

### Inspect Account

```bash
solana account <ACCOUNT_ADDRESS> --url devnet
```

### View Transactions

```bash
solana confirm -v <TX_SIGNATURE> --url devnet
```

## Security Considerations

1. **Time-based Access Control**: Uses `Clock::get()` to enforce voting windows
2. **Double-vote Prevention**: Voter PDAs with is_voted flag prevent multiple votes
3. **PDA Authority**: Ensures only program can modify accounts
4. **Input Validation**: All parameters validated before state changes

## Development Workflow

1. **Make changes** to program code in `programs/voting/src/`
2. **Build locally** with `anchor build`
3. **Run tests** with `anchor test`
4. **Deploy** with `anchor deploy`
5. **Verify** in frontend integration

## Useful Commands

```bash
anchor build              # Build program
anchor test              # Run tests
anchor deploy            # Deploy to configured cluster
anchor idl fetch PROGRAM_ID  # Fetch IDL from on-chain
anchor idl upgrade PROGRAM_ID  # Update IDL
```
## Resources

- [Anchor Documentation](https://docs.rs/anchor-lang/)
- [Solana Program Architecture](https://docs.solana.com/developing/programming-model/calling-between-programs)
- [PDA Documentation](https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses)

## Contributing

See the root repository [README.md](../README.md) for contribution guidelines.

## License

This project is built by 0xblackadam for Ackee Blockchain Security Bootcamp.
