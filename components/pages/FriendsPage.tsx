'use client';

import React, { useState, useMemo } from 'react';
import { Trash2, Search, UserPlus, Loader2, Check, X } from 'lucide-react';
import { User } from 'firebase/auth';
import { Friend } from '@/hooks/useData';
import { useUsers } from '@/hooks/useUsers';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface FriendsPageProps {
  friends: Friend[];
  onDeleteFriend: (friendId: string) => void;
  onNavigateToAddBill: () => void;
  authenticatedUser?: User | null;
}

export default function FriendsPage({
  friends,
  onDeleteFriend,
  onNavigateToAddBill,
  authenticatedUser,
}: FriendsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [requestSending, setRequestSending] = useState<string | null>(null);
  const { users, loading: usersLoading } = useUsers();
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
    const friendIds = new Set(friends.map(f => f.id));
    const authenticatedUserId = authenticatedUser?.uid;
    const outgoingRequestIds = new Set(outgoingRequests.map(r => r.recipientId));
    
    return users.filter(
      (user) =>
        user.uid !== authenticatedUserId &&
        !friendIds.has(user.uid) &&
        !outgoingRequestIds.has(user.uid) &&
        (user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query))
    );
  }, [searchQuery, friends, authenticatedUser?.uid, users, outgoingRequests]);

  const handleSendFriendRequest = async (user: typeof users[0]) => {
    try {
      setRequestSending(user.uid);
      await sendFriendRequest(user.uid, user.name, user.email);
      setSearchQuery('');
      setShowSearchResults(false);
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      alert(error.message || 'Failed to send friend request');
    } finally {
      setRequestSending(null);
    }
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    try {
      await acceptFriendRequest(requestId, senderId);
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject friend request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your friends and friend requests</p>
      </div>

      {/* Search Bar */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Find Friends
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            className="pl-10"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <>
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-80 overflow-y-auto">
                {usersLoading ? (
                  <div className="px-4 py-8 text-center flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-indigo-600" />
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
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSendFriendRequest(user)}
                          disabled={requestSending === user.uid}
                          className="flex-shrink-0 ml-2 px-3 py-2"
                        >
                          {requestSending === user.uid ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <UserPlus size={14} />
                              <span className="text-sm">Add</span>
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-medium text-gray-600">No users found</p>
                    <p className="text-xs text-gray-400 mt-1">Try searching by name or email</p>
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
              <Card key={request.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {request.senderName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{request.senderName}</p>
                    <p className="text-xs text-gray-500 truncate">{request.senderEmail}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-2">
                  <Button
                    variant="primary"
                    onClick={() => handleAcceptRequest(request.id, request.senderId)}
                    className="px-3 py-2"
                  >
                    <Check size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRejectRequest(request.id)}
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
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          Friends ({friends.length})
        </h3>
        {friends.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friends.map((friend) => (
              <Card key={friend.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-50 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{friend.name}</p>
                    {friend.email && (
                      <p className="text-xs text-gray-500 truncate">{friend.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteFriend(friend.id)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500 text-sm font-medium">No friends yet</p>
            <p className="text-gray-400 text-xs mt-1">Send friend requests to get started</p>
          </Card>
        )}
      </div>
    </div>
  );
}
