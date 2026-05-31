import { connect } from "react-redux";
import WalletComponent from "../../components/wallet/wallet";
import { getWallet } from "../../redux/actions/getWallet";
import { useEffect, useRef } from "react";
import { RootState } from "../../store";
import { IUser } from "../../interfaces/auth";
import { createDepositSession, withdrawFunds } from "../../redux/actions/walletActions";

type WalletProps = {
    getWallet: () => void;
    balance: number;
    user: IUser | null;
    pass_code: string;
    wallet_type: string;
    tokens: number;
    token_value_usd: number;
    gift_fee_pct: number;
    createDepositSession: (amount: number) => any;
    withdrawFunds: (amount: number) => any;
};

const Wallet = ({ getWallet, balance, user, pass_code, wallet_type, tokens, token_value_usd, gift_fee_pct, createDepositSession, withdrawFunds }: WalletProps) => {
    const count = useRef(0);

    useEffect(() => {
        if (!user) {
            if (count.current >= 1) return;
            count.current += 1;
            getWallet();
        }
    }, [user, getWallet]);

    useEffect(() => {
        const handleRefresh = () => getWallet();
        window.addEventListener("buzzy:refresh", handleRefresh);
        return () => window.removeEventListener("buzzy:refresh", handleRefresh);
    }, [getWallet]);

    return (
        <>
            <WalletComponent
                user={user}
                balances={balance}
                getWallet={getWallet}
                pass_code={pass_code}
                wallet_type={wallet_type}
                tokens={tokens}
                token_value_usd={token_value_usd}
                gift_fee_pct={gift_fee_pct}
                createDepositSession={createDepositSession}
                withdrawFunds={withdrawFunds}
            />
        </>
    );
};
import { GetWalletState } from "../../redux/reducers/getWallet";
const mapStateToProps = (state: RootState) => {
    const walletState = state.getWalletReducer as GetWalletState;
    return ({
        balance: walletState.balance || 0,
        user: walletState.user || null,
        pass_code: walletState.pass_code || "",
        wallet_type: walletState.wallet_type || "default",
        tokens: walletState.tokens || 0,
        token_value_usd: walletState.token_value_usd || 0.015,
        gift_fee_pct: walletState.gift_fee_pct || 30,
    });
};

// Asegúrate de que tu componente se llama 'Wallet' o ajusta el nombre
export default connect(mapStateToProps, { getWallet, createDepositSession, withdrawFunds })(Wallet);