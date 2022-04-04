import React, {useEffect, useState} from 'react';
import {ethers} from 'ethers';

import {contractABI, contractAddress} from '../../utils/constants';
// import { parse } from 'node:path/win32';

export const TransactionContext = React.createContext();

const {ethereum} = window;

const getEtheureumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);

    const signer = provider.getSigner();

    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer)
    console.log({
        provider, 
        signer,
        transactionContract
    })
    return transactionContract;
}

export const TransactionProvider = ({children}) =>{
    const [currentAccount, setCurrentAccount] = React.useState();
    const [formData, setFormData] = useState({addressTo: '', amount: '', keyword: '', message:''});
    const [isLoading, setIsLoading] = useState(false);
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'));
    const [transactions, setTransactions] = useState([]);
    const [currentBalance, setCurrentBalance] = useState(undefined);
    const handleChange = (e, name) =>{
        setFormData((prevState) => ({...prevState, [name]: e.target.value}));
    }
    const getEthBalance = async (address) =>{
        try{
            console.log(address);
            if (address){
                const provider =  new ethers.providers.Web3Provider(ethereum); 
                const balance = await provider.getBalance(address);  
                return ethers.utils.formatEther(balance);
            }
            
        }catch(e){
            console.log("Balance issues : " + e);
        } 
    }
    const getAllTransactions = async () =>{
        try {
            if (!ethereum) return alert("Please install metamask");
            const transactionContract = getEtheureumContract();
            const availableTransactions = await transactionContract.getAllTransactions();

            const structuredTransactions = availableTransactions.map((transaction) => ({
                addressTo: transaction.receiver,
                addressFrom: transaction.sender,
                timestamp : new Date( transaction.timestamp.toNumber() * 1000).toLocaleString(),
                message: transaction.message,
                keyword: transaction.keyword,
                amount: parseInt(transaction.amount._hex) / (10 ** 18)

            }));
            setTransactions(structuredTransactions); 
        } catch (error) {
            console.log(error);
            throw new Error("No ethereum object");
        }
    }

    const checkIfWalletIsConnected = async() => {

        try {
            if (!ethereum) return alert("Please install metamask");
            const accounts = await ethereum.request({method : 'eth_accounts'});

            if(accounts.length){
                setCurrentAccount(accounts[0]);
                
                getAllTransactions(); 
                const balance = await getEthBalance(accounts[0]);
                setCurrentBalance(balance);
            }else{
                console.log('No accounts Found');
            } 
            console.log(accounts);
            console.log(currentBalance);
        } catch (error) {
            console.log(error);
            throw new Error("No ethereum object");
        }
        
    }
    const checkIfTransactionExist = async () =>{
        try {
            const transactionContract = getEtheureumContract();
            const transactionCount = await transactionContract.getTransactionCount();
            window.localStorage.setItem("transactionCount", transactionCount);
        } catch (error) {
            console.log(error);
            throw new Error("No ethereum object");
        }
    }
    const connectWallet = async () => {
        try {
            if (!ethereum) return alert("Please install metamask");
            const accounts = await ethereum.request({method : 'eth_requestAccounts'});
            setCurrentAccount(accounts[0]); 
            getAllTransactions(); 
            const balance = await getEthBalance(accounts[0]);
            setCurrentBalance(balance);
        } catch (error) {
            console.log(error);
            throw new Error("No ethereum object")
            
        }
    }

    const sendTransaction = async () => {
        try{
            if (!ethereum) return alert("Please install metamask"); 
            const { addressTo, amount, keyword, message } = formData;
            const transactionContract = getEtheureumContract();
            const parsedAmount = ethers.utils.parseEther(amount);
            await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: currentAccount,
                    to: addressTo,
                    gas: '0x5208', //hex
                    value: parsedAmount._hex, // 0.00001
                }]
            });
            const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);
            setIsLoading(true);
            console.log(`Loading - ${transactionHash.hash}`);
            await transactionHash.wait();
            setIsLoading(false);
            console.log(`Success - ${transactionHash.hash}`);

            // const transactionCount  = await transactionContract.getTransactionCount();
            // transactionCount.wait();
            // setTransactionCount(transactionCount.toNumber());
            // getAllTransactions(); 
            // const balance = await getEthBalance(currentAccount);
            //  setCurrentBalance(balance ); 
            window.location.reload();
        }catch(error){
            console.log(error);
            throw new Error("No ethereum object")
            
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionExist(); 
    }, [])

   
    
 
    return (
        <TransactionContext.Provider value = {{transactionCount, currentBalance, connectWallet, currentAccount,formData, setFormData, handleChange, sendTransaction, transactions, isLoading}}>
            {children}
        </TransactionContext.Provider>
    )
}