import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, PublicKey } from '@solana/web3.js'
import { Voting } from '../target/types/voting'

describe('voting', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Voting as Program<Voting>

  const pollId = new anchor.BN(1)
  let pollPda: PublicKey
  let pollBump: number

  beforeAll(async () => {
    // Derive poll PDA
    const [pda, bump] = await PublicKey.findProgramAddress(
      [Buffer.from('poll'), pollId.toBuffer('le', 8)],
      program.programId
    )
    pollPda = pda
    pollBump = bump
  })

  it('Create Poll', async () => {
    const blockTime = await provider.connection.getBlockTime(await provider.connection.getSlot())
    let startTime = new anchor.BN(blockTime + 2)  // Start in 2 seconds
    const endTime = new anchor.BN(startTime.toNumber() + 3600) // End in 1 hour

    await program.methods
      .createPoll(pollId, 'Should we implement feature X?', 'A poll about implementing feature X', startTime, endTime)
      .accounts({
        creator: payer.publicKey,
        poll: pollPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    const poll = await program.account.poll.fetch(pollPda)

    expect(poll.title).toEqual('Should we implement feature X?')
    expect(poll.yesVotes).toEqual(0)
    expect(poll.noVotes).toEqual(0)
    expect(poll.startTime).toEqual(startTime)
  })

  it('Vote Yes', async () => {
    const [voterPda] = await PublicKey.findProgramAddress(
      [Buffer.from('voter'), pollId.toBuffer('le', 8), payer.publicKey.toBuffer()],
      program.programId
    )
    // wait 3 seconds to ensure poll is active
    await new Promise(resolve => setTimeout(resolve, 3000));

    await program.methods
      .vote(pollId, true)
      .accounts({
        poll: pollPda,
        voter: voterPda,
        voterSigner: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    const poll = await program.account.poll.fetch(pollPda)


    expect(poll.yesVotes).toEqual(1)
    expect(poll.noVotes).toEqual(0)
  })

  it('Vote No', async () => {
    const voter2 = Keypair.generate()

    // wait 3 seconds to ensure poll is active
    await new Promise(resolve => setTimeout(resolve, 3000));


    // Fund the voter2
    const tx = await provider.connection.requestAirdrop(voter2.publicKey, 1000000000)
    await provider.connection.confirmTransaction(tx)

    const [voterPda] = await PublicKey.findProgramAddress(
      [Buffer.from('voter'), pollId.toBuffer('le', 8), voter2.publicKey.toBuffer()],
      program.programId
    )

    await program.methods
      .vote(pollId, false)
      .accounts({
        poll: pollPda,
        voter: voterPda,
        voterSigner: voter2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter2])
      .rpc()

    const poll = await program.account.poll.fetch(pollPda)

    expect(poll.yesVotes).toEqual(1)
    expect(poll.noVotes).toEqual(1)
  })

  it('Should throw an error if closing a poll that is active', async () => {

    console.log("the poll data before closing", await program.account.poll.fetch(pollPda))

    expect (async () => {
      await program.methods
        .closePoll()
        .accounts({
          signer: payer.publicKey,
          poll: pollPda,
        })
        .rpc()
    }).rejects.toThrow()
  })
})
