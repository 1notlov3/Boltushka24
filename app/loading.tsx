import { Loader2 } from "lucide-react"



export default function Loading() {
    
    return (
        <div className="h-screen flex flex-col flex-1 justify-center items-center">
        <Loader2
          className="text-blue-500 dark:text-emerald-500 animate-spin h-20 w-20"
        />
        <p className="text-xl text-zinc-500 dark:text-zinc-400 m-5">
          Болтушка грузится
        </p>
      </div>
    )
  }