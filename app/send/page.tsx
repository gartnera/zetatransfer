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
import { prepareData } from "@zetachain/toolkit/client";

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
import { InvoiceManager__factory, InvoiceManager } from "@/typechain-types"
import { InvoiceAddr } from "../ZetaChainContext"
type InvoiceStruct = InvoiceManager.InvoiceStruct

const contracts: any = {
  goerli_testnet: "0x122F9Cca5121F23b74333D5FBd0c5D9B413bc002",
  mumbai_testnet: "0x392bBEC0537D48640306D36525C64442E98FA780",
  bsc_testnet: "0xc5d7437DE3A8b18f6380f3B8884532206272D599",
}

const MessagingPage = () => {
  const [message, setMessage] = useState("")
  const [destinationNetwork, setDestinationNetwork] = useState("")
  const [destinationChainID, setDestinationChainID] = useState(null)
  const [isZeta, setIsZeta] = useState(false)
  const [currentNetworkName, setCurrentNetworkName] = useState<any>("")
  const [completed, setCompleted] = useState(false)
  const [fee, setFee] = useState("")
  const [currentChain, setCurrentChain] = useState<any>()

  const [debouncedMessage] = useDebounce(message, 500)

  const allNetworks = Object.keys(contracts)
  const signer = useEthersSigner()

  const { chain } = useNetwork()
  useEffect(() => {
    setCurrentNetworkName(chain ? getNetworkName(chain.network) : undefined)
    if (chain) {
      setCurrentChain(chain)
      setIsZeta(getNetworkName(chain.network) === "zeta_testnet")
    }
  }, [chain])

  useEffect(() => {
    setDestinationChainID(
      (networks as any)[destinationNetwork]?.chain_id ?? null
    )
  }, [destinationNetwork])

  // @ts-ignore
  const contract = InvoiceManager__factory.connect(InvoiceAddr, signer);

  const [invoice, setInvoice] = useState<InvoiceStruct|undefined>(undefined);

  useEffect(() => {
    (async () => {
      const id = new URL(location.href).searchParams.get("id");
      if (!id) {
        return;
      }
      const invoice = await contract.getInvoice(id);
      setInvoice(invoice);
    })()
  })

  const payInvoice = async () => {
    if (!chain) {
      return
    }
    if (!invoice) {
      console.log("no invoice")
      return
    }
    const to = getAddress("tss", currentNetworkName);
    console.log(`got tss address for ${currentNetworkName}: ${to}`);
    if (!signer) {
      return
    }
    const transaction = await signer.sendTransaction({
      to: to,
      value: ethers.utils.parseEther(".01"),
      data: prepareData(InvoiceAddr, ["uint"], [invoice.id])
    });
    console.log(`sent transaction: ${transaction}`)
  }

  // const tx = await signer?.sendTransaction({ data, to, value })
  return (
    <div>
      <h1 className="text-2xl font-bold leading-tight tracking-tight mt-6 mb-4">
        Send payment!
      </h1>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (USD)</th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
          </tr>
        </thead>
        { invoice ? (
        <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.paid.toString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{
                // @ts-ignore
                invoice.priceUSD.toString()
              }</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.description}</td>
              </tr>
        </tbody>
        ) : <div></div>}
      </table>
      {
        (chain && isZeta) ? <div>
          <p>You need to switch your wallet to ETH or BSC to pay the invoice</p>
        </div> : (
          <Button onClick={payInvoice}>Pay</Button>
        )
      }
    </div>
  )
}

export default MessagingPage
