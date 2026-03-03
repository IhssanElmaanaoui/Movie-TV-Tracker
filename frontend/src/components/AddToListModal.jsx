import { useState, useEffect, useCallback } from 'react';
import { X, Plus, List, Check, Loader2, Trash2 } from 'lucide-react';
import { listService } from '../services/contentService';

/**
 * AddToListModal – shows user's custom lists and allows adding/removing content.
 *
 * Props:
 *   isOpen       – boolean, controls visibility
 *   onClose      – callback to close the modal
 *   user         – current user object (must have .id)
 *   tmdbId       – number, TMDB id of the content
 *   contentType  – 'MOVIE' | 'TV'
 *   contentTitle – string, title for display
 */
export default function AddToListModal({ isOpen, onClose, user, tmdbId, contentType, contentTitle }) {
    const [lists, setLists] = useState([]);
    const [listStatus, setListStatus] = useState({}); // { listId: boolean }
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({}); // { listId: boolean }
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDescription, setNewListDescription] = useState('');
    const [newListPublic, setNewListPublic] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const fetchData = useCallback(async () => {
        if (!user?.id || !tmdbId) return;
        setIsLoading(true);
        try {
            const [listsResult, checkResult] = await Promise.all([
                listService.getUserLists(user.id),
                listService.checkContentInLists(user.id, tmdbId, contentType),
            ]);
            if (listsResult.success) setLists(listsResult.data);
            if (checkResult.success) setListStatus(checkResult.data);
        } catch (e) {
            console.error('Error loading lists', e);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, tmdbId, contentType]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            setShowCreateForm(false);
            setNewListName('');
            setNewListDescription('');
            setNewListPublic(false);
            setCreateError('');
            setSuccessMsg('');
        }
    }, [isOpen, fetchData]);

    const handleToggleList = async (list) => {
        const inList = listStatus[list.id];
        setActionLoading(prev => ({ ...prev, [list.id]: true }));
        try {
            if (inList) {
                const result = await listService.removeFromList(user.id, list.id, tmdbId, contentType);
                if (result.success) {
                    setListStatus(prev => ({ ...prev, [list.id]: false }));
                    flash(`Removed from "${list.name}"`);
                }
            } else {
                const result = await listService.addToList(user.id, list.id, tmdbId, contentType);
                if (result.success) {
                    setListStatus(prev => ({ ...prev, [list.id]: true }));
                    flash(`Added to "${list.name}"`);
                }
            }
        } catch (e) {
            console.error('Toggle list error', e);
        } finally {
            setActionLoading(prev => ({ ...prev, [list.id]: false }));
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        if (!newListName.trim()) {
            setCreateError('List name is required');
            return;
        }
        setIsCreating(true);
        setCreateError('');
        try {
            const result = await listService.createList(user.id, {
                name: newListName.trim(),
                description: newListDescription.trim(),
                isPublic: newListPublic,
            });
            if (result.success) {
                const newList = result.data;
                setLists(prev => [...prev, newList]);
                setListStatus(prev => ({ ...prev, [newList.id]: false }));
                setShowCreateForm(false);
                setNewListName('');
                setNewListDescription('');
                setNewListPublic(false);
                flash(`List "${newList.name}" created!`);
            } else {
                setCreateError(result.error?.message || 'Failed to create list');
            }
        } catch (e) {
            setCreateError('Failed to create list');
        } finally {
            setIsCreating(false);
        }
    };

    const flash = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <List size={20} className="text-purple-400" />
                        <h2 className="text-lg font-semibold text-white">Add to List</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                {contentTitle && (
                    <div className="px-6 py-2 bg-gray-800/50 border-b border-gray-700">
                        <p className="text-sm text-gray-300 truncate">
                            <span className="text-gray-500">Content: </span>{contentTitle}
                        </p>
                    </div>
                )}

                {/* Success message */}
                {successMsg && (
                    <div className="mx-6 mt-3 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-lg text-green-300 text-sm">
                        {successMsg}
                    </div>
                )}

                {/* Lists */}
                <div className="px-6 py-4 max-h-72 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="text-sm">Loading lists...</span>
                        </div>
                    ) : lists.length === 0 ? (
                        <div className="text-center py-8">
                            <List size={40} className="text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm mb-1">No lists yet</p>
                            <p className="text-gray-500 text-xs">Create your first list below</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {lists.map((list) => {
                                const inList = listStatus[list.id] ?? false;
                                const loading = actionLoading[list.id] ?? false;
                                return (
                                    <li key={list.id}>
                                        <button
                                            onClick={() => handleToggleList(list)}
                                            disabled={loading}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${inList
                                                    ? 'bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30'
                                                    : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                                                }`}
                                        >
                                            {/* Checkbox indicator */}
                                            <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${inList ? 'bg-purple-600 border-purple-600' : 'border-gray-500'
                                                }`}>
                                                {inList && <Check size={12} className="text-white" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{list.name}</p>
                                                <p className="text-gray-400 text-xs">
                                                    {list.itemCount} item{list.itemCount !== 1 ? 's' : ''}
                                                    {list.description && <span className="ml-2 truncate">{list.description}</span>}
                                                </p>
                                            </div>

                                            {loading && <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Create new list */}
                <div className="px-6 pb-6 border-t border-gray-700 pt-4">
                    {!showCreateForm ? (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-xl text-purple-300 hover:text-purple-200 text-sm font-medium transition-all"
                        >
                            <Plus size={16} />
                            Create New List
                        </button>
                    ) : (
                        <form onSubmit={handleCreateList} className="space-y-3">
                            <h3 className="text-sm font-semibold text-white">New List</h3>

                            <input
                                type="text"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="List name *"
                                maxLength={255}
                                autoFocus
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />

                            <input
                                type="text"
                                value={newListDescription}
                                onChange={(e) => setNewListDescription(e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newListPublic}
                                    onChange={(e) => setNewListPublic(e.target.checked)}
                                    className="w-4 h-4 accent-purple-600"
                                />
                                <span className="text-gray-300 text-sm">Make list public</span>
                            </label>

                            {createError && (
                                <p className="text-red-400 text-xs">{createError}</p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                                >
                                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    {isCreating ? 'Creating...' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateForm(false); setCreateError(''); }}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
