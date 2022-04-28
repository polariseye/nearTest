import * as near from "near-api-js";
import {sha256} from "js-sha256";
import BN from 'bn.js';
import * as borsh from "borsh";
import {BigNumber} from "bignumber.js";
import axios from "axios";
import * as tunnel from "tunnel";
import { HttpsProxyAgent } from "https-proxy-agent";

//代理参考文档： https://www.scrapingbee.com/blog/proxy-node-fetch/
let oldFetch:any=global.fetch;
(function setProxy(){
    const HttpsProxyAgent = require('https-proxy-agent');
    (global as any).fetch=function(...arg:any[]):Promise<any>{
        arg[1].agent=new HttpsProxyAgent("http://127.0.0.1:1081");
        return oldFetch(...arg)
    }

    //axio 代理设置参考文档: https://masteringjs.io/tutorials/axios/proxy
    axios.defaults.proxy=false;
    axios.defaults.httpsAgent = new HttpsProxyAgent("http://127.0.0.1:1081");
})();

// api使用参考文档 https://docs.near.org/docs/api/naj-quick-reference
const PRIVATE_KEY_1="2h1M1qQYB2vDmchjzqm7435z6EaqnzzJsaYarjmZZEYSNFNCa68kbxLXDedcZDuvGoD9jVvn9PZn3LXE3HuEp76w";
const PUBLIC_KEY_1="ed25519:7VcUbLLQunwA3AMvUJNaqYXS1UGzyM4R1WZFXkZSTAYo";
const PUBLIC_KEY_1_HEX="607a7f2a62819335e9a4b95975b5bb5c7c39cff247e2c98e6bab9fe9a4b1e9d8";

const PRIVATE_KEY_2="5ZuL51TRnrS4M5VMbx4fxXQkeu4ZUhtEYKFUNUK3S7osB9qoCWmL4aDHihSDXndD6GH1Tqin7iJMGWM2tgALtKc6";
const PUBLIC_KEY_2="ed25519:BFMFR8H96TegNm5wWUJCpTMziASENZfsE7LbxjGfuS1Y";
const PUBLIC_KEY_2_HEX="9841e54c9af91bcefeaf58e6c450a91eb1ae4ec2ae4302220ce8fc277dc48583";

async function main(){
    await getTransactionHistory4();
}

main().then(()=>{
    console.log("finish");
}).catch((err)=>{
    console.info("error:", err);
});

async function generateSecret() {
    let secretObj = near.utils.KeyPairEd25519.fromRandom();
    let pubKey = secretObj.getPublicKey().toString();
    let privateKey = secretObj.secretKey.toString();

    console.log("public key:", pubKey);
    console.log("public key hex:", (near.utils.PublicKey.fromString(pubKey).data as any).hexSlice());
    console.log("private key:", privateKey);
}

async function creatConn():Promise<near.Near> {
    let keystore = new near.keyStores.InMemoryKeyStore();
    const connObj = await near.connect({
        keyStore: keystore,
        networkId: "testnet",
        nodeUrl: "https://rpc.testnet.near.org",
        headers: {}
    });
    
    return connObj;
}
async function creatArchivalConn():Promise<near.Near> {
    let keystore = new near.keyStores.InMemoryKeyStore();
    const connObj = await near.connect({
        keyStore: keystore,
        networkId: "testnet",
        nodeUrl: "https://archival-rpc.testnet.near.org",
        headers: {}
    });
    
    return connObj;
}
async function getBalanceTest() {    
    let connObj = await creatConn();
    
    const account = await connObj.account(PUBLIC_KEY_1_HEX);
    let balance = await account.getAccountBalance();
    console.info("balance:",balance);
    let detail = await account.getAccountDetails();
    console.info("detail:",detail);

    let state = await account.state();
    console.info("state:",state);
    /*
    const response = await connObj.connection.provider.query({
        request_type: "view_account",
        finality: "final",
        account_id: PUBLIC_KEY_1_HEX,
    });
    console.info("resp:",response);
    */
}

async function transferTest() {
    let connObj = await creatConn();
    let keyPairObj =  near.utils.KeyPairEd25519.fromString(PRIVATE_KEY_1);

    const account = await connObj.account(PUBLIC_KEY_1_HEX);
    //account.signAndSendTransaction();
    //account.sendMoney(); // 发送金额
    let accessKeys = await account.getAccessKeys();
    let accessKey = accessKeys[0];
    //console.info("accessKey:",accessKey.access_key);
    
    let blockObj = await connObj.connection.provider.block({finality:"final"});

    let transferObj = near.transactions.transfer(new BN("2000000000000000000000000"));
    let transactionObj = near.transactions.createTransaction(PUBLIC_KEY_1_HEX,
        keyPairObj.getPublicKey(),
        "qqnihao.testnet",
        ++accessKey.access_key.nonce,
        [transferObj],borsh.baseDecode(blockObj.header.hash));
    

    let message = borsh.serialize(near.transactions.SCHEMA, transactionObj);
    console.log("message:",Buffer.from(message).toString("hex"));
    let unsigned = sha256.array(message);
    let signVal = keyPairObj.sign(new Uint8Array(unsigned));    
    console.log("sign result:", Buffer.from( signVal.signature).toString("hex"))
        
    
    console.log("signVal:", borsh.baseEncode(signVal.signature));
    let signedTransaction = new near.transactions.SignedTransaction({
        transaction:transactionObj,
        signature:new near.transactions.Signature({
            keyType: keyPairObj.getPublicKey().keyType, data: signVal.signature
        }),
    });    

    console.info("transaction:",signedTransaction);
    let result = await connObj.connection.provider.sendTransaction(signedTransaction);
    console.info("send transaction result:", result);
    console.log("txHash:",result.transaction.hash);
}

async function blockTest() {
    let connObj = await creatConn();

    let blockObj = await connObj.connection.provider.block({finality:"final"});
    console.info("block:", blockObj);
    console.info("hash data:", borsh.baseDecode(blockObj.header.hash))
}

async function baseTest() {
    let connObj = await creatConn();
    let configInfo = await connObj.connection.provider.experimental_protocolConfig({
        block_id:"3iiUSWoA5ge35DASpmUrjwWJcejqYXphRFApdADAxfpL",
    } as any);
    console.info("config:",JSON.stringify(configInfo));
    /*
    let gasePrice =await connObj.connection.provider.gasPrice("3iiUSWoA5ge35DASpmUrjwWJcejqYXphRFApdADAxfpL");

    let blockDetail = await connObj.connection.provider.block("3iiUSWoA5ge35DASpmUrjwWJcejqYXphRFApdADAxfpL");
    console.info("gas price:", gasePrice);
    console.info("block detail:", blockDetail);
     */
}

/*
手续费计算文档参考:
https://docs.near.org/docs/concepts/gas

手续只能通过最近的区块得到大概的手续费信息。无法得到具体手续费值

near单位: 1000000000000000000000000
*/

async function feeCalculate() {
    let connObj = await creatConn();

    let latestBlockObj = await connObj.connection.provider.block({finality:"final"});
    let configInfo:any = await connObj.connection.provider.experimental_protocolConfig({
        block_id:latestBlockObj.header.hash,
    } as any);
    console.log("config:",JSON.stringify(configInfo));

    let gasLimit = configInfo.gas_limit;
    let maxGasPrice = configInfo.max_gas_price;
    let minGasPrice = configInfo.min_gas_price;
    console.info("gasLimit ", gasLimit);
    console.info("maxGasPrice ", maxGasPrice);
    console.info("minGasPrice ", minGasPrice);

    let transactionCosts = configInfo.runtime_config.transaction_costs;

    let deployContractCost:Fee = transactionCosts.action_creation_config.deploy_contract_cost;
    console.info("deployContractCost ", deployContractCost);
    let deploy_contract_cost_per_byte:Fee =transactionCosts.action_creation_config.deploy_contract_cost_per_byte;
    console.info("deploy_contract_cost_per_byte ", deploy_contract_cost_per_byte);
    let stake_cost:Fee = transactionCosts.action_creation_config.stake_cost;
    console.info("stake_cost ", stake_cost);
    let transfer_cost:Fee = transactionCosts.action_creation_config.transfer_cost;
    console.info("transfer_cost ", transfer_cost);
    let action_receipt_creation_config:Fee = transactionCosts.action_receipt_creation_config;
    console.info("action_receipt_creation_config ", action_receipt_creation_config);
    
    let data_receipt_base_cost:Fee = transactionCosts.data_receipt_creation_config.base_cost;
    console.info("data_receipt_base_cost ", data_receipt_base_cost);
    let data_receipt_cost_per_byte:Fee = transactionCosts.data_receipt_creation_config.cost_per_byte;
    console.info("data_receipt_cost_per_byte ", data_receipt_cost_per_byte);

    let function_call_cost:Fee = transactionCosts.action_creation_config.function_call_cost;
    console.info("function_call_cost: ", function_call_cost);
    let function_call_cost_per_byte:Fee = transactionCosts.action_creation_config.function_call_cost_per_byte;
    console.info("function_call_cost_per_byte: ", function_call_cost_per_byte);

    let nearTransferGasUnit = new BN(transfer_cost.execution)
            .add(new BN(action_receipt_creation_config.execution))
            .add(new BN(transfer_cost.send_sir))
            .add(new BN(action_receipt_creation_config.send_sir));
    
    let gas = nearTransferGasUnit.mul(new BN(latestBlockObj.header.gas_price));
    console.log("near gas unit:", nearTransferGasUnit.toString(), " gasTotal:",gas.toString());    
    console.log("near transfer gass fee:",new BigNumber(gas.toString()).div("1000000000000000000000000").toString());

    //let contractTransfferGasUnit =new BN( );
}

interface Fee{
    execution:number,
    send_not_sir:number,
    send_sir:number
}

async function checkTransactionState() {
    try{
        let connObj = await creatArchivalConn();
        let txStatus = await connObj.connection.provider.txStatus("9GkqC2MuiiD8Aq4VB7J6wwf7YrbU5MC4a5P8rtJejbEh",PUBLIC_KEY_1_HEX);
        console.info("txStatus:", txStatus);
    }catch(err){
        console.info("error result:",err);
    }
}

/*
    合约使用可以参考示例代码:https://github.com/near-examples/token-contract-as.git
*/
async function getContractBalance(){
    let connObj = await creatConn();
    
    let arg = Buffer.from( JSON.stringify({account_id:"qqnihao.testnet"})).toString("base64");

    let result:any = await connObj.connection.provider.query({
        request_type:"call_function",
        account_id:"usdn.testnet",
        args_base64: arg,
        finality:"optimistic",
        method_name:"ft_balance_of",
    });

    console.info("result:", result);
    console.info("balance result:",  JSON.parse(Buffer.from(result.result).toString()));
    
    /*
    let accountObj = await connObj.account("qqnihao.testnet");
    let contractObj:any = new near.Contract(accountObj,"usdn.testnet",{
        viewMethods:['totalSupply', 'balanceOf', 'allowance'],
        changeMethods:['init', 'transfer', 'approve', 'transferFrom']
    });
    
    await contractObj.init({initialOwner:"qqnihao.testnet"});

    let tokenData = await contractObj.balanceOf({tokenOwner:"qqnihao.testnet"})
    
    console.info("state:", tokenData);
    */
}

async function transferContract() {
    let connObj = await creatConn();
    let keyPairObj =  near.utils.KeyPairEd25519.fromString(PRIVATE_KEY_1);

    const account = await connObj.account(PUBLIC_KEY_1_HEX);
    //account.signAndSendTransaction();
    //account.sendMoney(); // 发送金额
    let accessKeys = await account.getAccessKeys();
    let accessKey = accessKeys[0];
    //console.info("accessKey:",accessKey.access_key);
    
    let blockObj = await connObj.connection.provider.block({finality:"final"});

    let transferObj = near.transactions.functionCall("ft_transfer",{
        to:"qqnihao.testnet",
        tokens:"100000",
    }, new BN("30000000000000"), new BN("0") );
    let transactionObj = near.transactions.createTransaction(PUBLIC_KEY_1_HEX,
        keyPairObj.getPublicKey(),
        "usdn.testnet",
        ++accessKey.access_key.nonce,
        [transferObj], borsh.baseDecode(blockObj.header.hash));
    

    let message = borsh.serialize(near.transactions.SCHEMA, transactionObj);
    let unsigned = sha256.array(message);
    let signVal = keyPairObj.sign(new Uint8Array(unsigned));    

   console.log("signVal:", borsh.baseEncode(signVal.signature));
    let signedTransaction = new near.transactions.SignedTransaction({
        transaction:transactionObj,
        signature:new near.transactions.Signature({
            keyType: keyPairObj.getPublicKey().keyType, data: signVal.signature
        }),
    });    

    console.info("transaction:", signedTransaction);
    let result = await connObj.connection.provider.sendTransaction(signedTransaction);
    console.info("send transaction result:", result);
    console.log("txHash:",result.transaction.hash);
}

async function getTransactionHistory() {
    try{
        // 这个只能查看最近的交易。而且过一段时间会消失
        let historyList = await axios.get(`https://helper.testnet.near.org/account/${PUBLIC_KEY_1_HEX}/activity`)
        console.info ("history list:",JSON.stringify(historyList.data));
    }catch(ex:any){
        console.info("request error:", ex.code);
    }
}

async function getTransactionHistory2() {
    try{
        // 提供的API只支持主网的，测试网APi无效
        //let historyList = await axios.post(`https://nearblocks.io/api/account/txns?address=epic.poolv1.near&limit=10&offset=0`,{
        let historyList = await axios.get(`https://testnet.nearblocks.io/api/account/txns?address=qqnihao.testnet&limit=10&offset=0`)
        console.info ("history list:",JSON.stringify(historyList.data));
    }catch(ex:any){
        console.info("request error:", ex.code);
    }
}

async function getTransactionHistory3() {    
    // API来源于区块浏览器的网络请求
    try{        
        let historyList = await axios.post(`https://api2-testnet.nearblocks.io/v1/graphql`,{
            variables:{
                address:"qqnihao.testnet",
                limit:25,
                offset:0
            },
            query:"query ($address: String, $limit: Int, $offset: Int) {\n  transactions(\n    limit: $limit\n    offset: $offset\n    order_by: {block_timestamp: desc}\n    where: {receipts: {_or: [{predecessor_account_id: {_eq: $address}}, {receiver_account_id: {_eq: $address}}]}}\n  ) {\n    ...transactionsFull\n    transaction_actions {\n      ...transactionActions\n      __typename\n    }\n    block {\n      ...blocks\n      __typename\n    }\n    receipts {\n      ...receiptsFull\n      execution_outcome {\n        ...executionOutcomes\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment blocks on blocks {\n  block_height\n  block_hash\n  block_timestamp\n  author_account_id\n  __typename\n}\n\nfragment receiptsFull on receipts {\n  receipt_id\n  included_in_block_hash\n  included_in_chunk_hash\n  index_in_chunk\n  included_in_block_timestamp\n  predecessor_account_id\n  receiver_account_id\n  receipt_kind\n  originated_from_transaction_hash\n  __typename\n}\n\nfragment transactionsFull on transactions {\n  transaction_hash\n  included_in_block_hash\n  included_in_chunk_hash\n  index_in_chunk\n  block_timestamp\n  signer_account_id\n  signer_public_key\n  nonce\n  receiver_account_id\n  signature\n  status\n  converted_into_receipt_id\n  receipt_conversion_gas_burnt\n  receipt_conversion_tokens_burnt\n  __typename\n}\n\nfragment executionOutcomes on execution_outcomes {\n  gas_burnt\n  tokens_burnt\n  __typename\n}\n\nfragment transactionActions on transaction_actions {\n  action_kind\n  args\n  __typename\n}",
        })
        console.info ("history list:",JSON.stringify(historyList.data));
    }catch(ex:any){
        console.info("request error:", ex.code);
    }
}

async function getTransactionHistory4() {    
    try{        
        let historyList = await axios.post(`https://api2.nearblocks.io/v1/graphql`,{
            variables:{
                address:"relay.aurora",
                limit:25,
                offset:0
            },
            query:"query ($address: String, $limit: Int, $offset: Int) {\n  transactions(\n    limit: $limit\n    offset: $offset\n    order_by: {block_timestamp: desc}\n    where: {receipts: {_or: [{predecessor_account_id: {_eq: $address}}, {receiver_account_id: {_eq: $address}}]}}\n  ) {\n    ...transactionsFull\n    transaction_actions {\n      ...transactionActions\n      __typename\n    }\n    block {\n      ...blocks\n      __typename\n    }\n    receipts {\n      ...receiptsFull\n      execution_outcome {\n        ...executionOutcomes\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment blocks on blocks {\n  block_height\n  block_hash\n  block_timestamp\n  author_account_id\n  __typename\n}\n\nfragment receiptsFull on receipts {\n  receipt_id\n  included_in_block_hash\n  included_in_chunk_hash\n  index_in_chunk\n  included_in_block_timestamp\n  predecessor_account_id\n  receiver_account_id\n  receipt_kind\n  originated_from_transaction_hash\n  __typename\n}\n\nfragment transactionsFull on transactions {\n  transaction_hash\n  included_in_block_hash\n  included_in_chunk_hash\n  index_in_chunk\n  block_timestamp\n  signer_account_id\n  signer_public_key\n  nonce\n  receiver_account_id\n  signature\n  status\n  converted_into_receipt_id\n  receipt_conversion_gas_burnt\n  receipt_conversion_tokens_burnt\n  __typename\n}\n\nfragment executionOutcomes on execution_outcomes {\n  gas_burnt\n  tokens_burnt\n  __typename\n}\n\nfragment transactionActions on transaction_actions {\n  action_kind\n  args\n  __typename\n}",
        })
        console.info ("history list:",JSON.stringify(historyList.data));
    }catch(ex:any){
        console.info("request error:", ex.code);
    }
}


// 质押文档：https://wiki.near.org/ecosystem/near-token/delegation
// 可质押节点查看: https://explorer.testnet.near.org/nodes/validators

// https://helper.testnet.near.org/staking-deposits/qqnihao.testnet
async function getStakeNodeList() {
    let response = await axios.get("https://helper.testnet.near.org/stakingPools");
    let stakingPoolList:string[] = response.data;
    
    let connObj = await creatConn();
    
    let arg = Buffer.from( JSON.stringify({})).toString("base64");

    for(let nodeItem of stakingPoolList){
        let result:any = await connObj.connection.provider.query({
            request_type:"call_function",
            account_id:nodeItem,
            args_base64: arg,
            finality:"optimistic",
            method_name:"get_reward_fee_fraction",
        });
    
        //console.info("result:", result);
        console.info( `node:${nodeItem} state:`,  JSON.parse(Buffer.from(result.result).toString()));
    }
}