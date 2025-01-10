-- CreateTable
CREATE TABLE "UserReferenceInPaymentTransaction" (
    "id" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserReferenceInPaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserReferenceInPaymentTransaction" ADD CONSTRAINT "UserReferenceInPaymentTransaction_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferenceInPaymentTransaction" ADD CONSTRAINT "UserReferenceInPaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
