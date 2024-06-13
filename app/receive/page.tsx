"use client"

import { useCallback, useContext, useEffect, useState } from "react"
import Link from "next/link"
import UniswapV2Factory from "@uniswap/v2-periphery/build/IUniswapV2Router02.json"
import Quoter from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json"
import { getExplorers } from "@zetachain/networks"
import { getEndpoints } from "@zetachain/networks/dist/src/getEndpoints"
import { getNetworkName } from "@zetachain/networks/dist/src/getNetworkName"
import networks from "@zetachain/networks/dist/src/networks"
import { getAddress, getNonZetaAddress } from "@zetachain/protocol-contracts"
import { ethers } from "ethers"
import { formatEther, parseEther } from "ethers/lib/utils"
import { AlertCircle, BookOpen, Check, Loader2, Send } from "lucide-react"
import { useDebounce } from "use-debounce"
import {
  useContractWrite,
  useNetwork,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi"

import { useEthersSigner } from "@/lib/ethers"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AppContext } from "@/app/index"

// Spinner component using Tailwind CSS
const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// @ts-ignore
const LoadingButton = ({ isLoading, children }) => (
  <button
    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
      isLoading ? 'cursor-not-allowed' : ''
    }`}
    type="submit"
    disabled={isLoading}
  >
    {isLoading ? <Spinner /> : children}
  </button>
);

import { InvoiceManager__factory } from "@/typechain-types"

import { InvoiceManager } from "@/typechain-types/contracts/InvoiceManager"
import { Skeleton } from "@/components/ui/skeleton"

type InvoiceStruct = InvoiceManager.InvoiceStruct

const LoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      {Array(3)
        .fill(null)
        .map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
    </div>
  )
}

const contracts: any = {
  goerli_testnet: "0x122F9Cca5121F23b74333D5FBd0c5D9B413bc002",
  mumbai_testnet: "0x392bBEC0537D48640306D36525C64442E98FA780",
  bsc_testnet: "0xc5d7437DE3A8b18f6380f3B8884532206272D599",
}

const MessagingPage = () => {
  const signer = useEthersSigner()

  // @ts-ignore
  const contract = InvoiceManager__factory.connect("0xF414178A366c5f7bd8C2d0666cd34df3B245AD42", signer);

  const [invoices, setInvoices] = useState<InvoiceStruct[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [isFormDisabled, setFormDisabled] = useState(false);

  useEffect(() => {
    (async () => {
      if (!signer) {
        return
      }
      console.log("getting invoices")
      const invoices = await contract.getMyInvoices()
      console.log("got invoice result");
      setInvoicesLoading(false);
      console.log(invoices)
      setInvoices(invoices);
    })()
  }, [signer])
  

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    console.log({ amount, description });
    try {
      setFormDisabled(true);
      const invoiceTransaction = await contract.createInvoice(description, amount);
      setFormDisabled(false);
      console.log(`invoice created: ${invoiceTransaction}`)
    } catch(e: any) {
      setFormDisabled(false);
      throw e;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold leading-tight tracking-tight mt-6 mb-4">
        New Invoice
      </h1>
      <p className="mb-6 text-gray-700">
        Create an invoice for a payment. Your invoice will be stored on ZetaChain. You will receive a link to share with the payer.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (USD)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <LoadingButton
          isLoading={isFormDisabled}
        >
          Create Invoice
        </LoadingButton>
      </form>
      <h1 className="text-2xl font-bold leading-tight tracking-tight mt-6 mb-4">
        Invoices
      </h1>
      { invoicesLoading ? LoadingSkeleton() : 
      invoices.length == 0 ? <p>You have no invoices</p> :
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Link</th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (USD)</th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoices.map((invoice, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><Link href={`/send?id=${invoice.id}`}>↗</Link></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.paid.toString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{
                // @ts-ignore
                invoice.priceUSD.toString()
              }</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
}
    </div>
  )
}

export default MessagingPage
