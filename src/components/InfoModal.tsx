import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-gray-800">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-white"
                                    >
                                        About AI Personality Pal
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>
                                <div className="mt-2 space-y-4 text-gray-300">
                                    <p>
                                        AI Personality Pal is an innovative chat application that creates personalized AI companions based on your interests and preferences. Our AI adapts its personality and conversation style to match your unique characteristics.
                                    </p>
                                    <div>
                                        <h4 className="text-white font-medium mb-2">Key Features:</h4>
                                        <ul className="list-disc list-inside space-y-2 text-gray-300">
                                            <li>Personalized AI personality based on your traits</li>
                                            <li>Adaptive conversation style</li>
                                            <li>Context-aware responses</li>
                                            <li>Secure and private conversations</li>
                                            <li>Real-time personality updates</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium mb-2">How It Works:</h4>
                                        <ol className="list-decimal list-inside space-y-2 text-gray-300">
                                            <li>Share your personality traits and interests</li>
                                            <li>Our AI analyzes your input to create a matching personality</li>
                                            <li>Start chatting with your personalized AI companion</li>
                                            <li>The AI adapts and evolves based on your interactions</li>
                                        </ol>
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        Your privacy is our top priority. All conversations are encrypted and never shared with third parties.
                                    </p>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default InfoModal; 