import { PublicKey } from "@solana/web3.js";

export const TokenBridgeInstruction = {
    Initialize: 0,
    AttestToken: 1,
    CompleteNative: 2,
    CompleteWrapped: 3,
    TransferWrapped: 4,
    TransferNative: 5,
    RegisterChain: 6,
    CreateWrapped: 7,
    UpgradeContract: 8,
    CompleteNativeWithPayload: 9,
    CompleteWrappedWithPayload: 10,
    TransferWrappedWithPayload: 11,
    TransferNativeWithPayload: 12,
};

export const programId = new PublicKey(`wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb`)

export function decodeWormholeInstruction(raw) {
    if (!raw || raw.length < 1) {
      return { name: "Unknown", disc: -1, error: "No data" };
    }
  
    const disc = raw.readUInt8(0);
  
    switch (disc) {
        case TokenBridgeInstruction.Initialize:
            return decodeInitialize(raw);
    
        case TokenBridgeInstruction.AttestToken:
            return decodeAttestToken(raw);
    
        case TokenBridgeInstruction.CompleteNative:
            return { name: "completeNative", disc, data: {} };
    
        case TokenBridgeInstruction.CompleteWrapped:
            return { name: "completeWrapped", disc, data: {} };
    
        case TokenBridgeInstruction.TransferWrapped:
            return decodeTransferData("transferWrapped", disc, raw);
    
        case TokenBridgeInstruction.TransferNative:
            return decodeTransferData("transferNative", disc, raw);
    
        case TokenBridgeInstruction.RegisterChain:
            return { name: "registerChain", disc, data: {} };
    
        case TokenBridgeInstruction.CreateWrapped:
            return { name: "createWrapped", disc, data: {} };
    
        case TokenBridgeInstruction.UpgradeContract:
            return { name: "upgradeContract", disc, data: {} };
    
        case TokenBridgeInstruction.CompleteNativeWithPayload:
            return { name: "completeNativeWithPayload", disc, data: {} };
    
        case TokenBridgeInstruction.CompleteWrappedWithPayload:
            return { name: "completeWrappedWithPayload", disc, data: {} };
    
        case TokenBridgeInstruction.TransferWrappedWithPayload:
            return decodeTransferWithPayload("transferWrappedWithPayload", disc, raw);
    
        case TokenBridgeInstruction.TransferNativeWithPayload:
            return decodeTransferWithPayload("transferNativeWithPayload", disc, raw);
    
        default:
            return {
                name: "unknown",
                disc,
                data: { rawHex: raw.toString("hex") },
            };
    }
}

function decodeInitialize(raw) {
    if (raw.length < 1 + 32) {
        return {
            name: "initialize",
            disc: TokenBridgeInstruction.Initialize,
            error: `Not enough bytes: have ${raw.length}, need 33`,
        };
    }

    const wormholeBuf = raw.subarray(1, 33);
    const wormholePubkey = new PublicKey(wormholeBuf);
  
    return {
        name: "initialize",
        disc: TokenBridgeInstruction.Initialize,
        data: {
            wormhole: wormholePubkey.toBase58(),
        },
    };
}


function decodeAttestToken(raw) {
    if (raw.length < 5) {
        return {
            name: "attestToken",
            disc: TokenBridgeInstruction.AttestToken,
            error: "Not enough bytes for nonce",
        };
    }

    const nonce = raw.readUInt32LE(1);
    return {
        name: "attestToken",
        disc: TokenBridgeInstruction.AttestToken,
        data: { nonce },
    };
}

function decodeTransferData(name, disc, raw) {
    if (raw.length < 55) {
        return {
            name,
            disc,
            error: `Not enough bytes: have ${raw.length}, need 55`,
        };
    }
  
    let offset = 1;
    const nonce = raw.readUInt32LE(offset);
    offset += 4;
  
    const amount = raw.readBigUInt64LE(offset); // Node.js >= 12
    offset += 8;
  
    const fee = raw.readBigUInt64LE(offset);
    offset += 8;
  
    const targetAddressBuf = raw.subarray(offset, offset + 32);
    offset += 32;
  
    const targetChain = raw.readUInt16LE(offset);
    offset += 2;
  
    return {
        name,
        disc,
        data: {
            nonce,
            amount,
            fee,
            targetAddress: "0x" + targetAddressBuf.toString("hex"),
            targetChain,
        },
    };
}

function decodeTransferWithPayload(name, disc, raw) {
    if (raw.length < 52) {
        return {
            name,
            disc,
            error: `Not enough bytes: have ${raw.length}, need >=52`,
        };
    }
  
    let offset = 1;
    const nonce = raw.readUInt32LE(offset);
    offset += 4;
  
    const amount = raw.readBigUInt64LE(offset);
    offset += 8;
  
    const targetAddressBuf = raw.subarray(offset, offset + 32);
    offset += 32;
  
    const targetChain = raw.readUInt16LE(offset);
    offset += 2;
  
    const payloadLen = raw.readUInt32LE(offset);
    offset += 4;
  
    const needed = 1 + 50 + payloadLen + 1; 
    if (raw.length < needed) {
        return {
            name,
            disc,
            error: `Not enough bytes for payload: have ${raw.length}, want ${needed}`,
        };
    }
  
    const payloadBuf = raw.subarray(offset, offset + payloadLen);
    offset += payloadLen;
  
    const option = raw.readUInt8(offset);
    offset += 1;
  
    return {
        name,
        disc,
        data: {
            nonce,
            amount,
            targetAddress: "0x" + targetAddressBuf.toString("hex"),
            targetChain,
            payload: "0x" + payloadBuf.toString("hex"),
            option,
        },
    };
}