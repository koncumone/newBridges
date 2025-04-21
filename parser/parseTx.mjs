import { decodeWormholeInstruction, programId } from "./wormholeInstructionDecoder.mjs";
import { wormhole_idl } from "./idl.js"

import bs58 from "bs58"

function findWormholeIdlInstruction(name) {
    return wormhole_idl.instructions.find(
        (inst) => inst.name === name
    );
}

function mapWormholeAccounts(ixAccounts, messageAccountKeys, idlAccounts) {
    const result = {};

    for (let i = 0; i < idlAccounts.length; i++) {
        const idlAccName = idlAccounts[i].name;
        const actualIndex = ixAccounts[i];
    
        if (actualIndex === undefined) {
            result[idlAccName] = null;
            continue;
        }
    
        const buf = messageAccountKeys[actualIndex];
        result[idlAccName] = bs58.encode(buf);
    }
    return result;
}

export function parseSolanaTransaction(txJson) {
    const { transaction } = txJson,
          { meta }        = transaction


    if (!transaction || !transaction.transaction || !transaction.transaction.message) {
        return { error: "No message in transaction", raw: txJson };
    }

    if (meta?.err) {
        return { error: "Error transaction", raw: txJson };
    }

    const message = transaction.transaction.message;
    const accountKeys = message.accountKeys || [];
    const instructions = message.instructions || [];


    const parsedInstructions = instructions.map((ix, i) => {

        const progIdIndex = ix.programIdIndex;
        const programIdBuf = accountKeys[progIdIndex]; 

        if (!programIdBuf) {
            return { index: i, error: "Missing programId" };
        }

        const programIdBase58 = toBase58(programIdBuf);

        const rawDataArr = ix.data; 
        if (!rawDataArr) {
            return { index: i, error: "No data for this instruction" };
        }

        const rawData = rawDataArr

        if (programIdBase58 === "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb") {
            const decoded = decodeWormholeInstruction(rawData);
            const idlInst = findWormholeIdlInstruction(decoded.name);

            let namedAccounts = {};
            if (idlInst) {
                const arr = ix.accounts || []; 
                namedAccounts = mapWormholeAccounts(arr, accountKeys, idlInst.accounts);
            }

            return {
                index: i,
                programId: programIdBase58,
                wormholeDecoded: decoded,
                namedAccounts,         
            };
        } else {
            return {
                index: i,
                programId: programIdBase58,
                dataHex: rawData.toString("hex").slice(0, 64) + "...",
            };
        }
    });

    return {
        signature: transaction.transaction.signatures?.map((sigBuf) => bufToBase58(sigBuf))[0],
        parsedInstruction: parsedInstructions.find(instruction => instruction.programId == `wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb`),
        logMessages: meta?.logMessages,
    };
}



function toBase58(buf) {
    if (!buf) return "";
    return bs58.encode(buf);
}

function bufToBase58(buf) {
    return bs58.encode(buf);
}