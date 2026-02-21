# Core diff — apply to `src/core/services/tx-execution/`

## 1. tx-execution-service.interface.ts

Add `scheduleId?: string` to **both** exported interfaces:

```diff
 export interface TransactionResult {
   transactionId: string;
   success: boolean;
   receipt: TransactionReceipt;
   accountId?: string;
   tokenId?: string;
   topicId?: string;
   contractId?: string;
+  scheduleId?: string;
   topicSequenceNumber?: number;
   consensusTimestamp: string;
 }

 export interface TransactionReceipt {
   status: TransactionStatus;
   accountId?: string;
   tokenId?: string;
   topicId?: string;
   topicSequenceNumber?: number;
   serials?: string[];
+  scheduleId?: string;
 }
```

## 2. tx-execution-service.ts — `processTransactionResponse`

Inside `processTransactionResponse`, after the existing `contractId` block, add:

```diff
+    let scheduleId: string | undefined;

     if (receipt.contractId) {
       contractId = receipt.contractId.toString();
     }

+    if (receipt.scheduleId) {
+      scheduleId = receipt.scheduleId.toString();
+    }

     return {
       transactionId: response.transactionId.toString(),
       success: receipt.status === Status.Success,
       consensusTimestamp,
       accountId,
       tokenId,
       topicId,
       contractId,
+      scheduleId,
       topicSequenceNumber,
       receipt: {
         status: {
           status: receipt.status === Status.Success ? 'success' : 'failed',
           transactionId: response.transactionId.toString(),
         },
         serials,
       },
     };
```
