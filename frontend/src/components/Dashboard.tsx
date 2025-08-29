import React, { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseEther, keccak256, toBytes, formatEther, parseGwei } from "viem";
import {
  ROYALTY_DISTRIBUTOR_ADDRESS,
  ROYALTY_DISTRIBUTOR_ABI,
} from "../contracts/RoyaltyDistributor";
import { trackAPI } from "../services/api";
import AnalyticsDashboard from "./AnalyticsDashboard";

interface Track {
  id: number;
  trackId: string;
  title: string;
  totalEarnings: number;
  createdAt: string;
  revenues: Array<{
    amount: number;
    platform: string;
    createdAt: string;
  }>;
}

interface RightHolder {
  address: string;
  percentage: number;
}

// Legacy gas pricing for Amoy testnet compatibility
const getLegacyGasConfig = (functionName: string) => {
  switch (functionName) {
    case "registerTrack":
      return {
        gas: 600000n,
        gasPrice: parseGwei("30"), // Legacy pricing
      };
    case "addRevenue":
      return {
        gas: 500000n,
        gasPrice: parseGwei("30"),
      };
    case "withdraw":
      return {
        gas: 150000n,
        gasPrice: parseGwei("25"), // Lower for simple operations
      };
    default:
      return {
        gas: 200000n,
        gasPrice: parseGwei("30"),
      };
  }
};

const Dashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, isPending, error } = useWriteContract();

  const [trackName, setTrackName] = useState("");
  const [revenueAmount, setRevenueAmount] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">(
    "overview",
  );
  const [rightHolders, setRightHolders] = useState<RightHolder[]>([
    { address: "", percentage: 100 },
  ]);

  const { data: pendingBalance } = useReadContract({
    address: ROYALTY_DISTRIBUTOR_ADDRESS,
    abi: ROYALTY_DISTRIBUTOR_ABI,
    functionName: "pendingWithdrawals",
    args: [address as `0x${string}`],
  });

  useEffect(() => {
    console.log("=== useEffect DEBUG ===");
    console.log("isConnected:", isConnected);
    console.log("address:", address);
    console.log("trackAPI object:", trackAPI);

    if (isConnected && address) {
      console.log("✓ Calling loadTracks...");
      console.log("loadTracks function:", loadTracks);
      try {
        loadTracks();
      } catch (err) {
        console.log("Error calling loadTracks:", err);
      }
      setRightHolders([{ address: address, percentage: 100 }]);
    } else {
      console.log("✗ Not calling loadTracks - missing connection or address");
    }
  }, [isConnected, address]);

  const loadTracks = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const fetchedTracks = await trackAPI.getTracks(address);
      setTracks(fetchedTracks);
    } catch (error) {
      console.error("Failed to load tracks:", error);
    } finally {
      setLoading(false);
    }
  };

  const addRightHolder = () => {
    setRightHolders([...rightHolders, { address: "", percentage: 0 }]);
  };

  const updateRightHolder = (
    index: number,
    field: "address" | "percentage",
    value: string | number,
  ) => {
    const updated = [...rightHolders];
    updated[index] = { ...updated[index], [field]: value };
    setRightHolders(updated);
  };

  const removeRightHolder = (index: number) => {
    if (rightHolders.length > 1) {
      setRightHolders(rightHolders.filter((_, i) => i !== index));
    }
  };

  const handleRegisterTrack = async () => {
    if (!trackName || !address) {
      alert("Please enter track name");
      return;
    }

    const totalPercentage = rightHolders.reduce(
      (sum, holder) => sum + holder.percentage,
      0,
    );
    if (totalPercentage !== 100) {
      alert("Percentages must sum to 100%");
      return;
    }

    const invalidHolders = rightHolders.filter((h) => !h.address);
    if (invalidHolders.length > 0) {
      alert("All right holders must have valid addresses");
      return;
    }

    try {
      const trackId = keccak256(toBytes(trackName));
      const holders = rightHolders.map((h) => h.address as `0x${string}`);
      const percentages = rightHolders.map((h) => h.percentage * 100);

      console.log("Track ID:", trackId);
      console.log("Holders:", holders);
      console.log("Percentages:", percentages);

      const gasConfig = getLegacyGasConfig("registerTrack");

      writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: "registerTrack",
        args: [trackId, holders, percentages],
        ...gasConfig,
      });

      // Save to database after blockchain success
      await trackAPI.registerTrack({
        trackId,
        title: trackName,
        walletAddress: address,
      });

      await loadTracks();
      setTrackName("");
      setRightHolders([{ address: address, percentage: 100 }]);
    } catch (error) {
      console.error("Register error:", error);

      if (error.message.includes("JSON-RPC")) {
        alert("RPC Error: Try again in a few seconds or switch RPC endpoint");
      } else if (error.message.includes("gas")) {
        alert("Gas estimation failed: Try with different gas settings");
      } else {
        alert("Registration failed. Please try with a unique track name.");
      }
    }
  };

  const handleAddRevenue = async () => {
    if (!selectedTrackId || !revenueAmount || !address) {
      alert("Please fill all fields");
      return;
    }

    try {
      const trackId = keccak256(toBytes(selectedTrackId));
      const gasConfig = getLegacyGasConfig("addRevenue");

      writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: "addRevenue",
        args: [trackId],
        value: parseEther(revenueAmount),
        ...gasConfig,
      });

      await trackAPI.addRevenue({
        trackId,
        amount: revenueAmount,
        platform: "manual",
      });

      await loadTracks();
      setSelectedTrackId("");
      setRevenueAmount("");
    } catch (error) {
      console.error("Add revenue error:", error);

      if (error.message.includes("JSON-RPC")) {
        alert("RPC Error: Try again in a few seconds");
      } else {
        alert("Failed to add revenue. Please try again.");
      }
    }
  };

  const handleWithdraw = async () => {
    try {
      console.log("Attempting withdraw with manual gas...");

      // Force the exact gas values that worked before
      writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: "withdraw",
        gas: 80000n, // Even lower gas
        gasPrice: parseGwei("15"), // Lower gas price
        account: address,
      });
    } catch (error) {
      console.error("Withdraw error:", error);
      alert(
        "Withdraw failed. Manual option: Go to Polygonscan, connect wallet, and call withdraw() function directly on contract 0xE8F3d2b0711Dd97EDD17795450a5961c1676E581",
      );
    }
  };

  if (!isConnected) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Connect Wallet</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            style={{ margin: "5px", padding: "10px" }}
          >
            Connect {connector.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      {/* Tab Navigation */}
      <div style={{ marginBottom: "20px", borderBottom: "1px solid #ccc" }}>
        <button
          onClick={() => setActiveTab("overview")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "overview" ? "#2196F3" : "#f5f5f5",
            color: activeTab === "overview" ? "white" : "black",
            border: "none",
            marginRight: "10px",
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "analytics" ? "#2196F3" : "#f5f5f5",
            color: activeTab === "analytics" ? "white" : "black",
            border: "none",
          }}
        >
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" ? (
        <>
          {/* Wallet Info */}
          <div
            style={{
              marginBottom: "20px",
              padding: "10px",
              border: "1px solid #ccc",
            }}
          >
            <p>
              <strong>Connected:</strong> {address}
            </p>
            <p>
              <strong>Pending Balance:</strong>{" "}
              {pendingBalance ? formatEther(pendingBalance) : "0"} MATIC
            </p>
            {isPending && (
              <p style={{ color: "orange" }}>Transaction pending...</p>
            )}
            {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
            <button
              onClick={() => disconnect()}
              style={{ margin: "5px", padding: "8px" }}
            >
              Disconnect
            </button>
            <button
              onClick={handleWithdraw}
              disabled={isPending}
              style={{
                margin: "5px",
                padding: "8px",
                backgroundColor: "#4CAF50",
                color: "white",
              }}
            >
              {isPending ? "Processing..." : "Withdraw"}
            </button>
          </div>

          {/* Register Track with Multiple Owners */}
          <div
            style={{
              marginBottom: "20px",
              padding: "10px",
              border: "1px solid #ccc",
            }}
          >
            <h3>Register Track</h3>
            <input
              type="text"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              placeholder="Track Name (must be unique)"
              style={{
                padding: "8px",
                marginBottom: "10px",
                width: "300px",
                display: "block",
              }}
            />

            <h4>Right Holders</h4>
            {rightHolders.map((holder, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "10px",
                  padding: "5px",
                  border: "1px solid #eee",
                }}
              >
                <input
                  type="text"
                  value={holder.address}
                  onChange={(e) =>
                    updateRightHolder(index, "address", e.target.value)
                  }
                  placeholder="Wallet Address"
                  style={{
                    padding: "5px",
                    width: "300px",
                    marginRight: "10px",
                  }}
                />
                <input
                  type="number"
                  value={holder.percentage}
                  onChange={(e) =>
                    updateRightHolder(
                      index,
                      "percentage",
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="Percentage"
                  min="0"
                  max="100"
                  style={{ padding: "5px", width: "80px", marginRight: "10px" }}
                />
                <span>%</span>
                {rightHolders.length > 1 && (
                  <button
                    onClick={() => removeRightHolder(index)}
                    style={{
                      marginLeft: "10px",
                      padding: "5px",
                      backgroundColor: "#ff4444",
                      color: "white",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addRightHolder}
              style={{
                padding: "8px",
                backgroundColor: "#888",
                color: "white",
                marginRight: "10px",
              }}
            >
              Add Right Holder
            </button>

            <button
              onClick={handleRegisterTrack}
              disabled={isPending}
              style={{
                padding: "8px",
                backgroundColor: "#2196F3",
                color: "white",
              }}
            >
              {isPending ? "Processing..." : "Register Track"}
            </button>

            <p>
              <small>
                Total: {rightHolders.reduce((sum, h) => sum + h.percentage, 0)}%
                (must equal 100%)
              </small>
            </p>
          </div>

          {/* Add Revenue */}
          <div
            style={{
              marginBottom: "20px",
              padding: "10px",
              border: "1px solid #ccc",
            }}
          >
            <h3>Add Revenue</h3>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              style={{ padding: "8px", marginRight: "10px", width: "200px" }}
            >
              <option value="">Select Track</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.title}>
                  {track.title}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={revenueAmount}
              onChange={(e) => setRevenueAmount(e.target.value)}
              placeholder="Amount (MATIC)"
              step="0.01"
              style={{ padding: "8px", marginRight: "10px", width: "150px" }}
            />
            <button
              onClick={handleAddRevenue}
              disabled={isPending}
              style={{
                padding: "8px",
                backgroundColor: "#FF9800",
                color: "white",
              }}
            >
              {isPending ? "Processing..." : "Add Revenue"}
            </button>
          </div>

          {/* Tracks List */}
          <div style={{ padding: "10px", border: "1px solid #ccc" }}>
            <h3>My Tracks {loading && "(Loading...)"}</h3>
            {tracks.length === 0 ? (
              <p>No tracks registered yet</p>
            ) : (
              tracks.map((track) => (
                <div
                  key={track.id}
                  style={{
                    padding: "10px",
                    margin: "5px",
                    border: "1px solid #eee",
                  }}
                >
                  <h4>{track.title}</h4>
                  <p>
                    <strong>Total Earnings:</strong> {track.totalEarnings} MATIC
                  </p>
                  <p>
                    <strong>Revenues:</strong> {track.revenues.length} payments
                  </p>
                  <small>
                    Registered: {new Date(track.createdAt).toLocaleDateString()}
                  </small>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <AnalyticsDashboard tracks={tracks} />
      )}
    </div>
  );
};

export default Dashboard;
