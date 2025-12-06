import { connect } from "react-redux";
import WalletComponent from "../../components/wallet/wallet";
import { getWallet } from "../../redux/actions/getWallet";
import { useEffect, useRef } from "react";
import { RootState } from "../../store";
import { IUser } from "../../interfaces/auth";

type WalletProps = {
    getWallet: () => void;
    balance: number;
    user: IUser | null;
    pass_code: string;
    wallet_type: string;
};

const Wallet = ({ getWallet, balance, user, pass_code, wallet_type }: WalletProps) => {
    const count = useRef(0);

    useEffect(() => {
        if (!user) {
            if (count.current >= 1) return;
            count.current += 1;
            getWallet();
        }
    }, [user, getWallet]);

    return (
        <>
            <WalletComponent
                user={user}
                balances={balance}
                getWallet={getWallet}
                pass_code={pass_code}
                wallet_type={wallet_type}
            />
        </>
    );
};
import { GetWalletState } from "../../redux/reducers/getWallet";
const mapStateToProps = (state: RootState) => {

    const walletState = state.getWalletReducer as GetWalletState;

    return ({
        // Usamos el operador || para proporcionar valores por defecto
        balance: walletState.balance || 0,
        user: walletState.user || null,
        pass_code: walletState.pass_code || "",
        wallet_type: walletState.wallet_type || "default",
    });
};

// Asegúrate de que tu componente se llama 'Wallet' o ajusta el nombre
export default connect(mapStateToProps, { getWallet })(Wallet);