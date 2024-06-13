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
  const { inbounds, setInbounds, fees } = useContext(AppContext)

  const {
    config,
    error: prepareError,
    isError: isPrepareError,
  } = usePrepareContractWrite({
    address: contracts[currentNetworkName || ""],
    abi: [
      {
        inputs: [
          {
            internalType: "uint256",
            name: "destinationChainId",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "message",
            type: "string",
          },
        ],
        name: "sendMessage",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
    ],
    value: BigInt(parseFloat(fee) * 1e18 || 0),
    functionName: "sendMessage",
    args: [
      BigInt(destinationChainID !== null ? destinationChainID : 0),
      debouncedMessage,
    ],
  })

  const { data, write } = useContractWrite(config)

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  })

  const convertZETAtoMATIC = async (amount: string) => {
    const quoterContract = new ethers.Contract(
      "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
      Quoter.abi,
      signer
    )
    const quotedAmountOut =
      await quoterContract.callStatic.quoteExactInputSingle(
        "0x0000c9ec4042283e8139c74f4c64bcd1e0b9b54f", // WZETA
        "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889", // WMATIC
        500,
        parseEther(amount),
        0
      )
    return quotedAmountOut
  }

  const getCCMFee = useCallback(async () => {
    try {
      if (!currentNetworkName || !destinationNetwork) {
        throw new Error("Network is not selected")
      }
      const feeZETA = fees.feesCCM[destinationNetwork].totalFee
      let fee
      if (currentNetworkName === "mumbai_testnet") {
        fee = await convertZETAtoMATIC(feeZETA)
      } else {
        const rpc = getEndpoints("evm", currentNetworkName)[0]?.url
        const provider = new ethers.providers.JsonRpcProvider(rpc)
        const routerAddress = getNonZetaAddress(
          "uniswapV2Router02",
          currentNetworkName
        )
        const router = new ethers.Contract(
          routerAddress,
          UniswapV2Factory.abi,
          provider
        )
        const amountIn = ethers.utils.parseEther(feeZETA)
        const zetaToken = getAddress("zetaToken", currentNetworkName)
        const weth = getNonZetaAddress("weth9", currentNetworkName)
        let zetaOut = await router.getAmountsOut(amountIn, [zetaToken, weth])
        fee = zetaOut[1]
      }
      fee = Math.ceil(parseFloat(formatEther(fee)) * 1.01 * 100) / 100 // 1.01 is to ensure that the fee is enough
      setFee(fee.toString())
    } catch (error) {
      console.error(error)
    }
  }, [currentNetworkName, destinationNetwork])

  useEffect(() => {
    try {
      getCCMFee()
    } catch (error) {
      console.error(error)
    }
  }, [currentNetworkName, destinationNetwork, signer])

  const explorer =
    destinationNetwork &&
    getExplorers(
      contracts[destinationNetwork],
      "address",
      destinationNetwork
    )[0]

  useEffect(() => {
    if (isSuccess && data) {
      const inbound = {
        inboundHash: data.hash,
        desc: `Message sent to ${destinationNetwork}`,
      }
      setCompleted(true)
      setInbounds([inbound, ...inbounds])
    }
  }, [isSuccess, data])

  useEffect(() => {
    setCompleted(false)
  }, [destinationNetwork, message])

  const availableNetworks = allNetworks.filter(
    (network) => network !== currentNetworkName
  )

  function extractDomain(url: string): string | null {
    try {
      const parsedURL = new URL(url)
      const parts = parsedURL.hostname.split(".")
      if (parts.length < 2) {
        return null
      }
      return parts[parts.length - 2]
    } catch (error) {
      console.error("Invalid URL provided:", error)
      return null
    }
  }

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ amount, description });
    alert('Invoice Created');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold leading-tight tracking-tight mt-6 mb-4">
        Receive Payment
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
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create Invoice
        </button>
      </form>
    </div>
  )
}

export default MessagingPage
