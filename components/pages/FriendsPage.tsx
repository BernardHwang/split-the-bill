"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Trash2, Search, UserPlus, Loader2, Check, X, TrendingUp, TrendingDown } from "lucide-react";
import { User } from "firebase/auth";
import { Bill, Friend } from "@/hooks/useData";
import { useUsers } from "@/hooks/useUsers";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useBalances } from "@/hooks/useBalances";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface FriendsPageProps {
    friends: Friend[];
    bills: Bill[];
    onDeleteFriend: (friendId: string) => void;
    onNavigateToAddBill: () => void;
    authenticatedUser?: User | null;
}

export default function FriendsPage({
    friends,
    bills,
    onDeleteFriend,
    onNavigateToAddBill,
    authenticatedUser,
}: FriendsPageProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [friendsSearchQuery, setFriendsSearchQuery] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [requestSending, setRequestSending] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const { users, loading: usersLoading } = useUsers();
    const balances = useBalances(bills, friends, authenticatedUser?.uid);
    const {
        incomingRequests,
        outgoingRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
    } = useFriendRequests(authenticatedUser);

    // Filter users based on search query
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase();
        const friendIds = new Set(friends.map((f) => f.id));
        const authenticatedUserId = authenticatedUser?.uid;
        const outgoingRequestIds = new Set(
            outgoingRequests.map((r) => r.recipientId)
        );

        return users.filter(
            (user) =>
                user.uid !== authenticatedUserId &&
                !friendIds.has(user.uid) &&
                !outgoingRequestIds.has(user.uid) &&
                (user.name.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query))
        );
    }, [searchQuery, friends, authenticatedUser?.uid, users, outgoingRequests]);

    // Filter friends based on search query
    const filteredFriends = useMemo(() => {
        if (!friendsSearchQuery.trim()) return friends;

        const query = friendsSearchQuery.toLowerCase();
        return friends.filter(
            (friend) =>
                friend.name.toLowerCase().includes(query) ||
                (friend.email && friend.email.toLowerCase().includes(query))
        );
    }, [friendsSearchQuery, friends]);

    const handleSendFriendRequest = useCallback(async (user: (typeof users)[0]) => {
        try {
            setRequestSending(user.uid);
            await sendFriendRequest(user.uid, user.name, user.email);
            setSearchQuery("");
            setShowSearchResults(false);
        } catch (error: any) {
            console.error("Error sending friend request:", error);
            alert(error.message || "Failed to send friend request");
        } finally {
            setRequestSending(null);
        }
    }, [sendFriendRequest]);

    const handleAcceptRequest = useCallback(async (requestId: string, senderId: string) => {
        try {
            await acceptFriendRequest(requestId, senderId);
        } catch (error) {
            console.error("Error accepting request:", error);
            alert("Failed to accept friend request");
        }
    }, [acceptFriendRequest]);

    const handleRejectRequest = useCallback(async (requestId: string) => {
        try {
            await rejectFriendRequest(requestId);
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert("Failed to reject friend request");
        }
    }, [rejectFriendRequest]);

    const handleDeleteFriend = useCallback(async (friendId: string, friendName: string) => {
        if (
            confirm(
                `Are you sure you want to remove ${friendName} from your friends?`
            )
        ) {
            try {
                setDeleting(friendId);
                await onDeleteFriend(friendId);
            } catch (error) {
                console.error("Error deleting friend:", error);
                alert("Failed to delete friend");
            } finally {
                setDeleting(null);
            }
        }
    }, [onDeleteFriend]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage your friends and friend requests
                </p>
            </div>

            {/* Search Bar */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Find Friends
                </label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Search size={18} />
                    </div>
                    <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSearchResults(true);
                        }}
                        onFocus={() =>
                            searchQuery && setShowSearchResults(true)
                        }
                        className="pl-12 pr-10 text-gray-700 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-gray-200 hover:border-indigo-300 focus:border-indigo-500 rounded-lg transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setShowSearchResults(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Clear search"
                        >
                            <X size={18} />
                        </button>
                    )}

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchQuery.trim() && (
                        <>
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-indigo-100 rounded-xl shadow-xl z-10 max-h-80 overflow-y-auto">
                                {usersLoading ? (
                                    <div className="px-4 py-8 text-center flex items-center justify-center">
                                        <Loader2
                                            size={20}
                                            className="animate-spin text-indigo-600"
                                        />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {searchResults.map((user) => (
                                            <div
                                                key={user.uid}
                                                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-50 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                        {user.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 text-sm truncate">
                                                            {user.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        handleSendFriendRequest(
                                                            user
                                                        )
                                                    }
                                                    disabled={
                                                        requestSending ===
                                                        user.uid
                                                    }
                                                    className="flex-shrink-0 ml-2 px-3 py-2"
                                                >
                                                    {requestSending ===
                                                    user.uid ? (
                                                        <Loader2
                                                            size={14}
                                                            className="animate-spin"
                                                        />
                                                    ) : (
                                                        <>
                                                            <UserPlus
                                                                size={14}
                                                            />
                                                            <span className="text-sm">
                                                                Add
                                                            </span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <p className="text-sm font-medium text-gray-600">
                                            No users found
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Try searching by name or email
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Close overlay */}
                            <div
                                className="fixed inset-0 z-0"
                                onClick={() => setShowSearchResults(false)}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Incoming Friend Requests */}
            {incomingRequests.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                        Friend Requests ({incomingRequests.length})
                    </h3>
                    <div className="space-y-2">
                        {incomingRequests.map((request) => (
                            <Card
                                key={request.id}
                                className="p-4 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                        {request.senderName
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 text-sm truncate">
                                            {request.senderName}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {request.senderEmail}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 ml-2">
                                    <Button
                                        variant="primary"
                                        onClick={() =>
                                            handleAcceptRequest(
                                                request.id,
                                                request.senderId
                                            )
                                        }
                                        className="px-3 py-2"
                                    >
                                        <Check size={16} />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            handleRejectRequest(request.id)
                                        }
                                        className="px-3 py-2"
                                    >
                                        <X size={16} />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                        Friends ({friends.length})
                    </h3>
                </div>

                {friends.length > 0 && (
                    <div className="mb-4">
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <Search size={18} />
                            </div>
                            <Input
                                placeholder="Search friends..."
                                value={friendsSearchQuery}
                                onChange={(e) =>
                                    setFriendsSearchQuery(e.target.value)
                                }
                                className="w-max pl-12 pr-10 text-gray-700 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-gray-200 hover:border-indigo-300 focus:border-indigo-500 rounded-lg transition-colors"
                            />
                            {friendsSearchQuery && (
                                <button
                                    onClick={() => setFriendsSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {friends.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredFriends.map((friend) => {
                            const balance = balances[friend.id];
                            const hasBalance = balance && (balance.owes > 0 || balance.owed > 0);
                            const netBalance = balance?.netBalance ?? 0;
                            const isUserOws = netBalance < 0;
                            
                            return (
                                <Card
                                    key={friend.id}
                                    className="p-4 flex flex-col hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-50 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                {friend.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 text-sm truncate">
                                                    {friend.name}
                                                </p>
                                                {friend.email && (
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {friend.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleDeleteFriend(friend.id, friend.name)
                                            }
                                            disabled={deleting === friend.id}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                                            title="Delete friend"
                                        >
                                            {deleting === friend.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </button>
                                    </div>

                                    {/* Balance Information */}
                                    {hasBalance && (
                                        <div className={`rounded-lg p-3 mb-3 flex items-center justify-between ${
                                            isUserOws
                                                ? 'bg-red-50 border border-red-100'
                                                : 'bg-green-50 border border-green-100'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {isUserOws ? (
                                                    <TrendingDown size={16} className="text-red-500" />
                                                ) : (
                                                    <TrendingUp size={16} className="text-green-500" />
                                                )}
                                                <span className={`text-xs font-medium ${
                                                    isUserOws ? 'text-red-700' : 'text-green-700'
                                                }`}>
                                                    {isUserOws ? 'You owe' : 'Owed to you'}
                                                </span>
                                            </div>
                                            <span className={`font-bold ${
                                                isUserOws ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                                ${Math.abs(netBalance).toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Balance Details */}
                                    {hasBalance && (
                                        <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-gray-100">
                                            {balance.owes > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Owes you:</span>
                                                    <span className="font-medium text-green-600">${balance.owes.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {balance.owed > 0 && (
                                                <div className="flex justify-between">
                                                    <span>You owe:</span>
                                                    <span className="font-medium text-red-600">${balance.owed.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                        {filteredFriends.length === 0 && friendsSearchQuery && (
                            <div className="col-span-full text-center py-8">
                                <p className="text-gray-500 text-sm font-medium">
                                    No friends found
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Try a different search
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <Card className="p-8 text-center">
                        <p className="text-gray-500 text-sm font-medium">
                            No friends yet
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                            Send friend requests to get started
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}
