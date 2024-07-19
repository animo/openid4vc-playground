import {
  Agent,
  ConsoleLogger,
  DidsModule,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidRegistrar,
  KeyDidResolver,
  LogLevel,
  WebDidResolver,
  joinUriParts,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import {
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
} from "@credo-ts/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  OpenId4VcHolderModule,
  OpenId4VcIssuerModule,
  OpenId4VcVerifierModule,
} from "@credo-ts/openid4vc";
import {
  AGENT_HOST,
  AGENT_WALLET_KEY,
} from "./constants";
import { Router } from "express";
import { credentialRequestToCredentialMapper } from "./issuer";

process.on("unhandledRejection", (reason) => {
  console.log("Unhandled rejection", reason);
});

export const openId4VciRouter = Router();
export const openId4VpRouter = Router();

export const agent = new Agent({
  dependencies: agentDependencies,
  config: {
    label: "OpenID4VC Playground",
    logger: new ConsoleLogger(LogLevel.trace),
    // TODO: add postgres storage
    walletConfig: {
      id: "openid4vc-playground",
      key: AGENT_WALLET_KEY,
    },
  },
  modules: {
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: [
        {
          genesisTransactions: `{"reqSignature":{},"txn":{"data":{"data":{"alias":"OpsNode","blskey":"4i39oJqm7fVX33gnYEbFdGurMtwYQJgDEYfXdYykpbJMWogByocaXxKbuXdrg3k9LP33Tamq64gUwnm4oA7FkxqJ5h4WfKH6qyVLvmBu5HgeV8Rm1GJ33mKX6LWPbm1XE9TfzpQXJegKyxHQN9ABquyBVAsfC6NSM4J5t1QGraJBfZi","blskey_pop":"Qq3CzhSfugsCJotxSCRAnPjmNDJidDz7Ra8e4xvLTEzQ5w3ppGray9KynbGPH8T7XnUTU1ioZadTbjXaRY26xd4hQ3DxAyR4GqBymBn3UBomLRJHmj7ukcdJf9WE6tu1Fp1EhxmyaMqHv13KkDrDfCthgd2JjAWvSgMGWwAAzXEow5","client_ip":"13.58.197.208","client_port":"9702","node_ip":"3.135.134.42","node_port":"9701","services":["VALIDATOR"]},"dest":"EVwxHoKXUy2rnRzVdVKnJGWFviamxMwLvUso7KMjjQNH"},"metadata":{"from":"Pms5AZzgPWHSj6nNmJDfmo"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"77ad6682f320be9969f70a37d712344afed8e3fba8d43fa5602c81b578d26088"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"cynjanode","blskey":"32DLSweyJRxVMcVKGjUeNkVF1fwyFfRcFqGU9x7qL2ox2STpF6VxZkbxoLkGMPnt3gywRaY6jAjqgC8XMkf3webMJ4SEViPtBKZJjCCFTf4tGXfEsMwinummaPja85GgTALf7DddCNyCojmkXWHpgjrLx3626Z2MiNxVbaMapG2taFX","blskey_pop":"RQRU8GVYSYZeu9dfH6myhzZ2qfxeVpCL3bTzgto1bRbx3QCt3mFFQQBVbgrqui2JpXhcWXxoDzp1WyYbSZwYqYQbRmvK7PPG82VAvVagv1n83Qa3cdyGwCevZdEzxuETiiXBRWSPfb4JibAXPKkLZHyQHWCEHcAEVeXtx7FRS1wjTd","client_ip":"3.17.103.221","client_port":"9702","node_ip":"3.17.215.226","node_port":"9701","services":["VALIDATOR"]},"dest":"iTq944JTtwHnst7rucfsRA4m26x9i6zCKKohETBCiWu"},"metadata":{"from":"QC174PGaL4zA9YHYqofPH2"},"type":"0"},"txnMetadata":{"seqNo":2,"txnId":"ce7361e44ec10a275899ece1574f6e38f2f3c7530c179fa07a2924e55775759b"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"GlobaliD","blskey":"4Behdr1KJfLTAPNospghtL7iWdCHca6MZDxAtzYNXq35QCUr4aqpLu6p4Sgu9wNbTACB3DbwmVgE2L7hX6UsasuvZautqUpf4nC5viFpH7X6mHyqLreBJTBH52tSwifQhRjuFAySbbfyRK3wb6R2Emxun9GY7MFNuy792LXYg4C6sRJ","blskey_pop":"RKYDRy8oTxKnyAV3HocapavH2jkw3PVe54JcEekxXz813DFbEy87N3i3BNqwHB7MH93qhtTRb7EZMaEiYhm92uaLKyubUMo5Rqjve2jbEdYEYVRmgNJWpxFKCmUBa5JwBWYuGunLMZZUTU3qjbdDXkJ9UNMQxDULCPU5gzLTy1B5kb","client_ip":"13.56.175.126","client_port":"9702","node_ip":"50.18.84.131","node_port":"9701","services":["VALIDATOR"]},"dest":"2ErWxamsNGBfhkFnwYgs4UW4aApct1kHUvu7jbkA1xX4"},"metadata":{"from":"4H8us7B1paLW9teANv8nam"},"type":"0"},"txnMetadata":{"seqNo":3,"txnId":"0c3b33b77e0419d6883be35d14b389c3936712c38a469ac5320a3cae68be1293"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"IdRamp","blskey":"LoYzqUMPDZEfRshwGSzkgATxcM5FAS1LYx896zHnMfXP7duDsCQ6CBG2akBkZzgH3tBMvnjhs2z7PFc2gFeaKUF9fKDHhtbVqPofxH3ebcRfA959qU9mgvmkUwMUgwd21puRU6BebUwBiYxMxcE5ChReBnAkdAv19gVorm3prBMk94","blskey_pop":"R1DjpsG7UxgwstuF7WDUL17a9Qq64vCozwJZ88bTrSDPwC1cdRn3WmhqJw5LpEhFQJosDSVVT6tS8dAZrrssRv2YsELbfGEJ7ZGjhNjZHwhqg4qeustZ7PZZE3Vr1ALSHY4Aa6KpNzGodxu1XymYZWXAFokPAs3Kho8mKcJwLCHn3h","client_ip":"207.126.128.12","client_port":"9702","node_ip":"207.126.129.12","node_port":"9701","services":["VALIDATOR"]},"dest":"5Zj5Aec6Kt9ki1runrXu87wZ522mnm3zwmaoHLUcHLx9"},"metadata":{"from":"AFLDFPoJuDQUHqnfmg8U7i"},"type":"0"},"txnMetadata":{"seqNo":4,"txnId":"c9df105558333ac8016610d9da5aad1e9a5dd50b9d9cc5684e94f439fa10f836"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"idlab-node01","blskey":"2fjJVi33U1tCTjW77cJaf1NLz7EzWkVNzR9BEQpVVK64MJpRKNUzt6k7Td2U8yqU5hGyAFH5N7ZymSB55TnpC3rJYLVTcGXZeXpmrQx3mwnXNyfTDnxfTpdQ1KMoFeZoDPZ8acfaH8GWeW2jL1qREE52tetBf4tXTeshmWzGkEN7r4y","blskey_pop":"RSjiM6dYUmN2rv2ca7dUCmEKrivq12rhxhXUKHdmSwUxbCmcijsgoERjYG7MqxhKLjSAJ5715K23fVEc6uK1kTenKmYCcCts8MLMAQG8Upb22nfgHJ3py8RwRoACeAjFF3myAMNRJJPhUdv96drJdwkGRv7f6JjvoB5KWVQYTNgheP","client_ip":"205.159.92.17","client_port":"9702","node_ip":"205.159.92.16","node_port":"9701","services":["VALIDATOR"]},"dest":"8czYgwmLDazVrBHuo53Tyx7Tw8ZhvnoC2BfhQGir4r8F"},"metadata":{"from":"PN8wFxLKjdkwyxoEEXwyz2"},"type":"0"},"txnMetadata":{"seqNo":5,"txnId":"9237eca7d2a203f6e1779f63064d2f22cf28e1bcd4e6fe5d791b15e82969acdc"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"lorica-identity-node1","blskey":"wUh24sVCQ8PHDgSb343g2eLxjD5vwxsrETfuV2sbwMNnYon9nhbaK5jcWTekvXtyiwxHxuiCCoZwKS97MQEAeC2oLbbMeKjYm212QwSnm7aKLEqTStXht35VqZvZLT7Q3mPQRYLjMGixdn4ocNHrBTMwPUQYycEqwaHWgE1ncDueXY","blskey_pop":"R2sMwF7UW6AaD4ALa1uB1YVPuP6JsdJ7LsUoViM9oySFqFt34C1x1tdHDysS9wwruzaaEFui6xNPqJ8eu3UBqcFKkoWhdsMqCALwe63ytxPwvtLtCffJLhHAcgrPC7DorXYdqhdG2cevdqc5oqFEAaKoFDBf12p5SsbbM4PYWCmVCb","client_ip":"35.225.220.151","client_port":"9702","node_ip":"35.224.26.110","node_port":"9701","services":["VALIDATOR"]},"dest":"k74ZsZuUaJEcB8RRxMwkCwdE5g1r9yzA3nx41qvYqYf"},"metadata":{"from":"Ex6hzsJFYzNJ7kzbfncNeU"},"type":"0"},"txnMetadata":{"seqNo":6,"txnId":"6880673ce4ae4a2352f103d2a6ae20469dd070f2027283a1da5e62a64a59d688"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"cysecure-itn","blskey":"GdCvMLkkBYevRFi93b6qaj9G2u1W6Vnbg8QhRD1chhrWR8vRE8x9x7KXVeUBPFf6yW5qq2JCfA2frc8SGni2RwjtTagezfwAwnorLhVJqS5ZxTi4pgcw6smebnt4zWVhTkh6ugDHEypHwNQBcw5WhBZcEJKgNbyVLnHok9ob6cfr3u","blskey_pop":"RbH9mY7M5p3UB3oj4sT1skYwMkxjoUnja8eTYfcm83VcNbxC9zR9pCiRhk4q1dJT3wkDBPGNKnk2p83vaJYLcgMuJtzoWoJAWAxjb3Mcq8Agf6cgQpBuzBq2uCzFPuQCAhDS4Kv9iwA6FsRnfvoeFTs1hhgSJVxQzDWMVTVAD9uCqu","client_ip":"35.169.19.171","client_port":"9702","node_ip":"54.225.56.21","node_port":"9701","services":["VALIDATOR"]},"dest":"4ETBDmHzx8iDQB6Xygmo9nNXtMgq9f6hxGArNhQ6Hh3u"},"metadata":{"from":"uSXXXEdBicPHMMhr3ddNF"},"type":"0"},"txnMetadata":{"seqNo":7,"txnId":"3c21718b07806b2f193b35953dda5b68b288efd551dce4467ce890703d5ba549"},"ver":"1"}`,
          indyNamespace: "indicio:testnet",
          isProduction: false,
          // FIXME: indy not fully working yet
          connectOnStartup: false,
          transactionAuthorAgreement: {
            acceptanceMechanism: "for_session",
            version: "1.0",
          },
        },
      ],
    }),
    dids: new DidsModule({
      resolvers: [
        new KeyDidResolver(),
        new JwkDidResolver(),
        new IndyVdrIndyDidResolver(),
        new WebDidResolver(),
        new CheqdDidResolver(),
      ],
      registrars: [
        new KeyDidRegistrar(),
        new JwkDidRegistrar(),
        new IndyVdrIndyDidRegistrar(),
        new CheqdDidRegistrar(),
      ],
    }),
    askar: new AskarModule({
      ariesAskar,
    }),
    openId4VcIssuer: new OpenId4VcIssuerModule({
      baseUrl: joinUriParts(AGENT_HOST, ["oid4vci"]),
      router: openId4VciRouter,
      endpoints: {
        credential: {
          credentialRequestToCredentialMapper,
        },
      },
    }),
    openId4VcHolder: new OpenId4VcHolderModule(),
    openId4VcVerifier: new OpenId4VcVerifierModule({
      baseUrl: joinUriParts(AGENT_HOST, ["siop"]),
      router: openId4VpRouter,
    }),
  },
});
