//! # Migrating from v21 to v22
//!
//! 1. [`Env::register`] and [`Env::register_at`] replace [`Env::register_contract`] and [`Env::register_contract_wasm`].
//!
//!    [`register`] registers both native contracts previously registered with
//!    [`register_contract`] and Wasm contracts previously registered with
//!    [`register_contract_wasm`]. It accepts a tuple that is passed to the
//!    contracts constructor. Pass `()` if the contract has no constructor.
//!
//!    ```
//!    use soroban_sdk::{contract, contractimpl, Env};
//!
//!    #[contract]
//!    pub struct Contract;
//!
//!    #[contractimpl]
//!    impl Contract {
//!        // ..
//!    }
//!
//!    #[test]
//!    fn test() {
//!    # }
//!    # #[cfg(feature = "testutils")]
//!    # fn main() {
//!        let env = Env::default();
//!        let address = env.register(
//!            Contract,  // 👈 👀 The contract being registered, or a Wasm `&[u8]`.
//!            (),        // 👈 👀 The constructor arguments, or ().
//!        );
//!        // ..
//!    }
//!    # #[cfg(not(feature = "testutils"))]
//!    # fn main() { }
//!    ```
//!
//!    [`register_at`] registers both native contracts previously registered
//!    with [`register_contract`] and Wasm contracts previously registered with
//!    [`register_contract_wasm`], and allows setting the address that the
//!    contract is registered at. It accepts a tuple that is passed to the
//!    contracts constructor. Pass `()` if the contract has no constructor.
//!
//!    ```
//!    use soroban_sdk::{contract, contractimpl, Env, Address, testutils::Address as _};
//!
//!    #[contract]
//!    pub struct Contract;
//!
//!    #[contractimpl]
//!    impl Contract {
//!        // ..
//!    }
//!
//!    #[test]
//!    fn test() {
//!    # }
//!    # #[cfg(feature = "testutils")]
//!    # fn main() {
//!        let env = Env::default();
//!        let address = Address::generate(&env);
//!        env.register_at(
//!            &address,   // 👈 👀 The address to register the contract at.
//!            Contract,  // 👈 👀 The contract being registered, or a Wasm `&[u8]`.
//!            (),        // 👈 👀 The constructor arguments, or ().
//!        );
//!        // ..
//!    }
//!    # #[cfg(not(feature = "testutils"))]
//!    # fn main() { }
//!    ```
//!
//! 2. [`DeployerWithAddress::deploy_v2`] replaces [`DeployerWithAddress::deploy`].
//!
//!    [`deploy_v2`] is the same as [`deploy`], except it accepts a list of
//!    arguments to be passed to the contracts constructor that will be called
//!    when it is deployed. For deploying existing contracts that do not have
//!    constructors, pass `()`.
//!
//!    ```
//!    use soroban_sdk::{contract, contractimpl, BytesN, Env};
//!
//!    #[contract]
//!    pub struct Contract;
//!
//!    #[contractimpl]
//!    impl Contract {
//!        pub fn exec(env: Env, wasm_hash: BytesN<32>) {
//!            let salt = [0u8; 32];
//!            let deployer = env.deployer().with_current_contract(salt);
//!            // Pass `()` for contracts that have no contstructor, or have a
//!            // constructor and require no arguments. Pass arguments in a
//!            // tuple if any required.
//!            let contract_address = deployer.deploy_v2(wasm_hash, ());
//!        }
//!    }
//!
//!    #[test]
//!    fn test() {
//!    # }
//!    # #[cfg(feature = "testutils")]
//!    # fn main() {
//!        let env = Env::default();
//!        let contract_address = env.register(Contract, ());
//!        let contract = ContractClient::new(&env, &contract_address);
//!        // Upload the contract code before deploying its instance.
//!        const WASM: &[u8] = include_bytes!("../doctest_fixtures/contract.wasm");
//!        let wasm_hash = env.deployer().upload_contract_wasm(WASM);
//!        contract.exec(&wasm_hash);
//!    }
//!    # #[cfg(not(feature = "testutils"))]
//!    # fn main() { }
//!    ```
//!
//! 2. Deprecated [`fuzz_catch_panic`]. Use [`Env::try_invoke_contract`] and the `try_` client functions instead.
//!
//!    The `fuzz_catch_panic` function could be used in fuzz tests to catch a contract panic. Improved behavior can be found by invoking a contract with the `try_` variant of the invoke function contract clients.
//!
//!    ```
//!    use libfuzzer_sys::fuzz_target;
//!    use soroban_sdk::{contract, contracterror, contractimpl, Env, testutils::arbitrary::*};
//!
//!    #[contract]
//!    pub struct Contract;
//!
//!    #[contracterror]
//!    #[derive(Debug, PartialEq)]
//!    pub enum Error {
//!        Overflow = 1,
//!    }
//!
//!    #[contractimpl]
//!    impl Contract {
//!        pub fn add(x: u32, y: u32) -> Result<u32, Error> {
//!            x.checked_add(y).ok_or(Error::Overflow)
//!        }
//!    }
//!
//!    #[derive(Arbitrary, Debug)]
//!    pub struct Input {
//!        pub x: u32,
//!        pub y: u32,
//!    }
//!
//!    fuzz_target!(|input: Input| {
//!        let env = Env::default();
//!        let id = env.register(Contract, ());
//!        let client = ContractClient::new(&env, &id);
//!
//!        let result = client.try_add(&input.x, &input.y);
//!        match result {
//!            // Returned if the function succeeds, and the value returned is
//!            // the type expected.
//!            Ok(Ok(_)) => {}
//!            // Returned if the function succeeds, and the value returned is
//!            // NOT the type expected.
//!            Ok(Err(_)) => panic!("unexpected type"),
//!            // Returned if the function fails, and the error returned is
//!            // recognised as part of the contract errors enum.
//!            Err(Ok(_)) => {}
//!            // Returned if the function fails, and the error returned is NOT
//!            // recognised, or the contract panic'd.
//!            Err(Err(_)) => panic!("unexpected error"),
//!        }
//!    });
//!
//!    # fn main() { }
//!    ```
//!
//! 3. Events in test snapshots are now reduced to only contract events and system events. Diagnostic events will no longer appear in test snapshots.
//!
//!    This will cause all test snapshot JSON files generated by the SDK to change when upgrading to this major version of the SDK. The change should be isolated to events and should omit only diagnostic events.
//!
//! [`Env::register`]: crate::Env::register
//! [`register`]: crate::Env::register
//! [`Env::register_at`]: crate::Env::register_at
//! [`register_at`]: crate::Env::register_at
//! [`Env::register_contract`]: crate::Env::register_contract
//! [`register_contract`]: crate::Env::register_contract
//! [`Env::register_contract_wasm`]: crate::Env::register_contract_wasm
//! [`register_contract_wasm`]: crate::Env::register_contract_wasm
//! [`DeployerWithAddress::deploy_v2`]: crate::deploy::DeployerWithAddress::deploy_v2
//! [`deploy_v2`]: crate::deploy::DeployerWithAddress::deploy_v2
//! [`DeployerWithAddress::deploy`]: crate::deploy::DeployerWithAddress::deploy
//! [`deploy`]: crate::deploy::DeployerWithAddress::deploy
//! [`fuzz_catch_panic`]: crate::testutils::arbitrary::fuzz_catch_panic
//! [`Env::try_invoke_contract`]: crate::Env::try_invoke_contract
//!
//! # Migrating from v20 to v21
//!
//! 1. [`CustomAccountInterface::__check_auth`] function `signature_payload` parameter changes from type [`BytesN<32>`] to [`Hash<32>`].
//!
//!    The two types are interchangeable. [`Hash<32>`] contains a [`BytesN<32>`] and can only be constructed in contexts where the value has been generated by a secure cryptographic function.
//!
//!    To convert from a [`Hash<32>`] to a [`BytesN<32>`], use [`Hash<32>::to_bytes`] or [`Into::into`].
//!
//!    Current implementations of the interface will see a build error, and should change [`BytesN<32>`] to [`Hash<32>`].
//!
//!    ```
//!    use soroban_sdk::{
//!        auth::{Context, CustomAccountInterface}, contract,
//!        contracterror, contractimpl, crypto::Hash, Env,
//!        Vec,
//!    };
//!
//!    #[contract]
//!    pub struct Contract;
//!
//!    #[contracterror]
//!    pub enum Error {
//!        AnError = 1,
//!        // ...
//!    }
//!
//!    #[contractimpl]
//!    impl CustomAccountInterface for Contract {
//!        type Signature = ();
//!        type Error = Error;
//!
//!        fn __check_auth(
//!            env: Env,
//!            signature_payload: Hash<32>, // 👈 👀
//!            signatures: (),
//!            auth_contexts: Vec<Context>,
//!        ) -> Result<(), Self::Error> {
//!            // ...
//!    #       todo!()
//!        }
//!    }
//!
//!    # fn main() { }
//!    ```
//!
//! [`CustomAccountInterface::__check_auth`]: crate::auth::CustomAccountInterface::__check_auth
//! [`BytesN<32>`]: crate::BytesN
//! [`Hash<32>`]: crate::crypto::Hash
//! [`Hash<32>::to_bytes`]: crate::crypto::Hash::to_bytes

#![cfg(any(test, feature = "testutils"))]
#![cfg_attr(feature = "docs", doc(cfg(feature = "testutils")))]

//! Utilities intended for use when testing.

pub mod arbitrary;

mod sign;
use std::rc::Rc;

pub use sign::ed25519;

mod mock_auth;
pub use mock_auth::{
    AuthorizedFunction, AuthorizedInvocation, MockAuth, MockAuthContract, MockAuthInvoke,
};
use soroban_env_host::TryIntoVal;

pub mod storage;

pub mod cost_estimate;

use crate::{xdr, ConstructorArgs, Env, Val, Vec};
use soroban_ledger_snapshot::LedgerSnapshot;

pub use crate::env::EnvTestConfig;

pub trait Register {
    fn register<'i, I, A>(self, env: &Env, id: I, args: A) -> crate::Address
    where
        I: Into<Option<&'i crate::Address>>,
        A: ConstructorArgs;
}

impl<C> Register for C
where
    C: ContractFunctionSet + 'static,
{
    fn register<'i, I, A>(self, env: &Env, id: I, args: A) -> crate::Address
    where
        I: Into<Option<&'i crate::Address>>,
        A: ConstructorArgs,
    {
        env.register_contract_with_constructor(id, self, args)
    }
}

impl<'w> Register for &'w [u8] {
    fn register<'i, I, A>(self, env: &Env, id: I, args: A) -> crate::Address
    where
        I: Into<Option<&'i crate::Address>>,
        A: ConstructorArgs,
    {
        env.register_contract_wasm_with_constructor(id, self, args)
    }
}

#[derive(Default, Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Snapshot {
    pub generators: Generators,
    pub auth: AuthSnapshot,
    pub ledger: LedgerSnapshot,
    pub events: EventsSnapshot,
}

impl Snapshot {
    // Read in a [`Snapshot`] from a reader.
    pub fn read(r: impl std::io::Read) -> Result<Snapshot, std::io::Error> {
        Ok(serde_json::from_reader::<_, Snapshot>(r)?)
    }

    // Read in a [`Snapshot`] from a file.
    pub fn read_file(p: impl AsRef<std::path::Path>) -> Result<Snapshot, std::io::Error> {
        Self::read(std::fs::File::open(p)?)
    }

    // Write a [`Snapshot`] to a writer.
    pub fn write(&self, w: impl std::io::Write) -> Result<(), std::io::Error> {
        Ok(serde_json::to_writer_pretty(w, self)?)
    }

    // Write a [`Snapshot`] to file.
    pub fn write_file(&self, p: impl AsRef<std::path::Path>) -> Result<(), std::io::Error> {
        let p = p.as_ref();
        if let Some(dir) = p.parent() {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        self.write(std::fs::File::create(p)?)
    }
}

#[derive(Default, Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct EventsSnapshot(pub std::vec::Vec<EventSnapshot>);

impl EventsSnapshot {
    // Read in a [`EventsSnapshot`] from a reader.
    pub fn read(r: impl std::io::Read) -> Result<EventsSnapshot, std::io::Error> {
        Ok(serde_json::from_reader::<_, EventsSnapshot>(r)?)
    }

    // Read in a [`EventsSnapshot`] from a file.
    pub fn read_file(p: impl AsRef<std::path::Path>) -> Result<EventsSnapshot, std::io::Error> {
        Self::read(std::fs::File::open(p)?)
    }

    // Write a [`EventsSnapshot`] to a writer.
    pub fn write(&self, w: impl std::io::Write) -> Result<(), std::io::Error> {
        Ok(serde_json::to_writer_pretty(w, self)?)
    }

    // Write a [`EventsSnapshot`] to file.
    pub fn write_file(&self, p: impl AsRef<std::path::Path>) -> Result<(), std::io::Error> {
        let p = p.as_ref();
        if let Some(dir) = p.parent() {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        self.write(std::fs::File::create(p)?)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct EventSnapshot {
    pub event: xdr::ContractEvent,
    pub failed_call: bool,
}

impl From<crate::env::internal::events::HostEvent> for EventSnapshot {
    fn from(v: crate::env::internal::events::HostEvent) -> Self {
        Self {
            event: v.event,
            failed_call: v.failed_call,
        }
    }
}

#[derive(Default, Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct AuthSnapshot(
    pub std::vec::Vec<std::vec::Vec<(xdr::ScAddress, xdr::SorobanAuthorizedInvocation)>>,
);

impl AuthSnapshot {
    // Read in a [`AuthSnapshot`] from a reader.
    pub fn read(r: impl std::io::Read) -> Result<AuthSnapshot, std::io::Error> {
        Ok(serde_json::from_reader::<_, AuthSnapshot>(r)?)
    }

    // Read in a [`AuthSnapshot`] from a file.
    pub fn read_file(p: impl AsRef<std::path::Path>) -> Result<AuthSnapshot, std::io::Error> {
        Self::read(std::fs::File::open(p)?)
    }

    // Write a [`AuthSnapshot`] to a writer.
    pub fn write(&self, w: impl std::io::Write) -> Result<(), std::io::Error> {
        Ok(serde_json::to_writer_pretty(w, self)?)
    }

    // Write a [`AuthSnapshot`] to file.
    pub fn write_file(&self, p: impl AsRef<std::path::Path>) -> Result<(), std::io::Error> {
        let p = p.as_ref();
        if let Some(dir) = p.parent() {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        self.write(std::fs::File::create(p)?)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Generators {
    address: u64,
    nonce: u64,
}

impl Default for Generators {
    fn default() -> Generators {
        Generators {
            address: 0,
            nonce: 0,
        }
    }
}

impl Generators {
    // Read in a [`Generators`] from a reader.
    pub fn read(r: impl std::io::Read) -> Result<Generators, std::io::Error> {
        Ok(serde_json::from_reader::<_, Generators>(r)?)
    }

    // Read in a [`Generators`] from a file.
    pub fn read_file(p: impl AsRef<std::path::Path>) -> Result<Generators, std::io::Error> {
        Self::read(std::fs::File::open(p)?)
    }

    // Write a [`Generators`] to a writer.
    pub fn write(&self, w: impl std::io::Write) -> Result<(), std::io::Error> {
        Ok(serde_json::to_writer_pretty(w, self)?)
    }

    // Write a [`Generators`] to file.
    pub fn write_file(&self, p: impl AsRef<std::path::Path>) -> Result<(), std::io::Error> {
        let p = p.as_ref();
        if let Some(dir) = p.parent() {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        self.write(std::fs::File::create(p)?)
    }
}

impl Generators {
    pub fn address(&mut self) -> [u8; 32] {
        self.address = self.address.checked_add(1).unwrap();
        let b: [u8; 8] = self.address.to_be_bytes();
        [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, b[0], b[1],
            b[2], b[3], b[4], b[5], b[6], b[7],
        ]
    }

    pub fn nonce(&mut self) -> i64 {
        self.nonce = self.nonce.checked_add(1).unwrap();
        self.nonce as i64
    }
}

#[doc(hidden)]
pub type ContractFunctionF = dyn Send + Sync + Fn(Env, &[Val]) -> Val;
#[doc(hidden)]
pub trait ContractFunctionRegister {
    fn register(name: &'static str, func: &'static ContractFunctionF);
}
#[doc(hidden)]
pub trait ContractFunctionSet {
    fn call(&self, func: &str, env: Env, args: &[Val]) -> Option<Val>;
}

#[doc(inline)]
pub use crate::env::internal::LedgerInfo;

/// Test utilities for [`Ledger`][crate::ledger::Ledger].
pub trait Ledger {
    /// Set ledger info.
    fn set(&self, l: LedgerInfo);

    /// Sets the protocol version.
    fn set_protocol_version(&self, protocol_version: u32);

    /// Sets the sequence number.
    fn set_sequence_number(&self, sequence_number: u32);

    /// Sets the timestamp.
    fn set_timestamp(&self, timestamp: u64);

    /// Sets the network ID.
    fn set_network_id(&self, network_id: [u8; 32]);

    /// Sets the base reserve.
    fn set_base_reserve(&self, base_reserve: u32);

    /// Sets the minimum temporary entry time-to-live.
    fn set_min_temp_entry_ttl(&self, min_temp_entry_ttl: u32);

    /// Sets the minimum persistent entry time-to-live.
    fn set_min_persistent_entry_ttl(&self, min_persistent_entry_ttl: u32);

    /// Sets the maximum entry time-to-live.
    fn set_max_entry_ttl(&self, max_entry_ttl: u32);

    /// Get ledger info.
    fn get(&self) -> LedgerInfo;

    /// Modify the ledger info.
    fn with_mut<F>(&self, f: F)
    where
        F: FnMut(&mut LedgerInfo);
}

pub mod budget {
    use core::fmt::{Debug, Display};

    #[doc(inline)]
    use crate::env::internal::budget::CostTracker;
    #[doc(inline)]
    pub use crate::xdr::ContractCostType;

    /// Budget that tracks the resources consumed for the environment.
    ///
    /// The budget consistents of two cost dimensions:
    ///  - CPU instructions
    ///  - Memory
    ///
    /// Inputs feed into those cost dimensions.
    ///
    /// Note that all cost dimensions – CPU instructions, memory – and the VM
    /// cost type inputs are likely to be underestimated when running Rust code
    /// compared to running the WASM equivalent.
    ///
    /// ### Examples
    ///
    /// ```
    /// use soroban_sdk::{Env, Symbol};
    ///
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// env.cost_estimate().budget().reset_default();
    /// // ...
    /// println!("{}", env.cost_estimate().budget());
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    pub struct Budget(pub(crate) crate::env::internal::budget::Budget);

    impl Display for Budget {
        fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
            writeln!(f, "{}", self.0)
        }
    }

    impl Debug for Budget {
        fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
            writeln!(f, "{:?}", self.0)
        }
    }

    impl Budget {
        pub(crate) fn new(b: crate::env::internal::budget::Budget) -> Self {
            Self(b)
        }

        /// Reset the budget.
        pub fn reset_default(&mut self) {
            self.0.reset_default().unwrap();
        }

        pub fn reset_unlimited(&mut self) {
            self.0.reset_unlimited().unwrap();
        }

        pub fn reset_limits(&mut self, cpu: u64, mem: u64) {
            self.0.reset_limits(cpu, mem).unwrap();
        }

        pub fn reset_tracker(&mut self) {
            self.0.reset_tracker().unwrap();
        }

        /// Returns the CPU instruction cost.
        ///
        /// Note that CPU instructions are likely to be underestimated when
        /// running Rust code compared to running the WASM equivalent.
        pub fn cpu_instruction_cost(&self) -> u64 {
            self.0.get_cpu_insns_consumed().unwrap()
        }

        /// Returns the memory cost.
        ///
        /// Note that memory is likely to be underestimated when running Rust
        /// code compared to running the WASM equivalent.
        pub fn memory_bytes_cost(&self) -> u64 {
            self.0.get_mem_bytes_consumed().unwrap()
        }

        /// Get the cost tracker associated with the cost type. The tracker
        /// tracks the cumulative iterations and inputs and derived cpu and
        /// memory. If the underlying model is a constant model, then inputs is
        /// `None` and only iterations matter.
        ///
        /// Note that VM cost types are likely to be underestimated when running
        /// natively as Rust code inside tests code compared to running the WASM
        /// equivalent.
        pub fn tracker(&self, cost_type: ContractCostType) -> CostTracker {
            self.0.get_tracker(cost_type).unwrap()
        }

        /// Print the budget costs and inputs to stdout.
        pub fn print(&self) {
            println!("{}", self.0);
        }
    }
}

/// Test utilities for [`Events`][crate::events::Events].
pub trait Events {
    /// Returns all events that have been published by contracts.
    ///
    /// Returns a [`Vec`] of three element tuples containing:
    /// - Contract ID
    /// - Event Topics as a [`Vec<Val>`]
    /// - Event Data as a [`Val`]
    fn all(&self) -> Vec<(crate::Address, Vec<Val>, Val)>;
}

/// Test utilities for [`Logs`][crate::logs::Logs].
pub trait Logs {
    /// Returns all diagnostic events that have been logged.
    fn all(&self) -> std::vec::Vec<String>;
    /// Prints all diagnostic events to stdout.
    fn print(&self);
}

/// Test utilities for [`BytesN`][crate::BytesN].
pub trait BytesN<const N: usize> {
    // Generate a BytesN filled with random bytes.
    //
    // The value filled is not cryptographically secure.
    fn random(env: &Env) -> crate::BytesN<N>;
}

/// Generates an array of N random bytes.
///
/// The value returned is not cryptographically secure.
pub(crate) fn random<const N: usize>() -> [u8; N] {
    use rand::RngCore;
    let mut arr = [0u8; N];
    rand::thread_rng().fill_bytes(&mut arr);
    arr
}

pub trait Address {
    /// Generate a new Address.
    ///
    /// Implementation note: this always builds the contract addresses now. This
    /// shouldn't normally matter though, as contracts should be agnostic to
    /// the underlying Address value.
    fn generate(env: &Env) -> crate::Address;
}

pub trait Deployer {
    /// Gets the TTL of the given contract's instance.
    ///
    /// TTL is the number of ledgers left until the instance entry is considered
    /// expired, excluding the current ledger.
    ///
    /// Panics if there is no instance corresponding to the provided address,
    /// or if the instance has expired.
    fn get_contract_instance_ttl(&self, contract: &crate::Address) -> u32;

    /// Gets the TTL of the given contract's Wasm code entry.
    ///
    /// TTL is the number of ledgers left until the contract code entry
    /// is considered expired, excluding the current ledger.
    ///
    /// Panics if there is no contract instance/code corresponding to
    /// the provided address, or if the instance/code has expired.
    fn get_contract_code_ttl(&self, contract: &crate::Address) -> u32;
}

pub use xdr::AccountFlags as IssuerFlags;

#[derive(Clone)]
pub struct StellarAssetIssuer {
    env: Env,
    account_id: xdr::AccountId,
}

impl StellarAssetIssuer {
    pub(crate) fn new(env: Env, account_id: xdr::AccountId) -> Self {
        Self { env, account_id }
    }

    /// Returns the flags for the issuer.
    pub fn flags(&self) -> u32 {
        self.env
            .host()
            .with_mut_storage(|storage| {
                let k = Rc::new(xdr::LedgerKey::Account(xdr::LedgerKeyAccount {
                    account_id: self.account_id.clone(),
                }));

                let entry = storage.get(
                    &k,
                    soroban_env_host::budget::AsBudget::as_budget(self.env.host()),
                )?;

                match entry.data {
                    xdr::LedgerEntryData::Account(ref e) => Ok(e.flags.clone()),
                    _ => panic!("expected account entry but got {:?}", entry.data),
                }
            })
            .unwrap()
    }

    /// Adds the flag specified to the existing issuer flags
    pub fn set_flag(&self, flag: IssuerFlags) {
        self.overwrite_issuer_flags(self.flags() | (flag as u32))
    }

    /// Clears the flag specified from the existing issuer flags
    pub fn clear_flag(&self, flag: IssuerFlags) {
        self.overwrite_issuer_flags(self.flags() & (!(flag as u32)))
    }

    pub fn address(&self) -> crate::Address {
        xdr::ScAddress::Account(self.account_id.clone())
            .try_into_val(&self.env.clone())
            .unwrap()
    }

    /// Sets the issuer flags field.
    /// Each flag is a bit with values corresponding to [xdr::AccountFlags]
    ///
    /// Use this to test interactions between trustlines/balances and the issuer flags.
    fn overwrite_issuer_flags(&self, flags: u32) {
        if u64::from(flags) > xdr::MASK_ACCOUNT_FLAGS_V17 {
            panic!(
                "issuer flags value must be at most {}",
                xdr::MASK_ACCOUNT_FLAGS_V17
            );
        }

        self.env
            .host()
            .with_mut_storage(|storage| {
                let k = Rc::new(xdr::LedgerKey::Account(xdr::LedgerKeyAccount {
                    account_id: self.account_id.clone(),
                }));

                let mut entry = storage
                    .get(
                        &k,
                        soroban_env_host::budget::AsBudget::as_budget(self.env.host()),
                    )?
                    .as_ref()
                    .clone();

                match entry.data {
                    xdr::LedgerEntryData::Account(ref mut e) => e.flags = flags,
                    _ => panic!("expected account entry but got {:?}", entry.data),
                }

                storage.put(
                    &k,
                    &Rc::new(entry),
                    None,
                    soroban_env_host::budget::AsBudget::as_budget(self.env.host()),
                )?;
                Ok(())
            })
            .unwrap();
    }
}

pub struct StellarAssetContract {
    address: crate::Address,
    issuer: StellarAssetIssuer,
}

impl StellarAssetContract {
    pub(crate) fn new(address: crate::Address, issuer: StellarAssetIssuer) -> Self {
        Self { address, issuer }
    }

    pub fn address(&self) -> crate::Address {
        self.address.clone()
    }

    pub fn issuer(&self) -> StellarAssetIssuer {
        self.issuer.clone()
    }
}

use core::convert::Infallible;

pub trait UnwrapOptimized {
    type Output;
    fn unwrap_optimized(self) -> Self::Output;
}

impl<T> UnwrapOptimized for Option<T> {
    type Output = T;

    #[inline(always)]
    fn unwrap_optimized(self) -> Self::Output {
        #[cfg(target_family = "wasm")]
        match self {
            Some(t) => t,
            None => core::arch::wasm32::unreachable(),
        }
        #[cfg(not(target_family = "wasm"))]
        self.unwrap()
    }
}

impl<T, E: core::fmt::Debug> UnwrapOptimized for Result<T, E> {
    type Output = T;

    #[inline(always)]
    fn unwrap_optimized(self) -> Self::Output {
        #[cfg(target_family = "wasm")]
        match self {
            Ok(t) => t,
            Err(_) => core::arch::wasm32::unreachable(),
        }
        #[cfg(not(target_family = "wasm"))]
        self.unwrap()
    }
}

pub trait UnwrapInfallible {
    type Output;
    fn unwrap_infallible(self) -> Self::Output;
}

impl<T> UnwrapInfallible for Result<T, Infallible> {
    type Output = T;

    fn unwrap_infallible(self) -> Self::Output {
        match self {
            Ok(ok) => ok,
            // In the following `Err(never)` branch we convert a type from
            // `Infallible` to `!`. Both of these are empty types and are
            // essentially synonyms in rust, they differ only due to historical
            // reasons that will eventually be eliminated. `Infallible` is a
            // version we can put in a structure, and `!` is one that gets some
            // special control-flow treatments.
            //
            // Specifically: the type `!` of the resulting expression will be
            // considered an acceptable inhabitant of any type -- including
            // `Self::Output` -- since it's an impossible path to execute, this
            // is considered a harmless convenience in the type system, a bit
            // like defining zero-divided-by-anything as zero.
            //
            // We could also write an infinite `loop {}` here or
            // `unreachable!()` or similar expressions of type `!`, but
            // destructuring the `never` variable into an empty set of cases is
            // the most honest since it's statically checked to _be_ infallible,
            // not just an assertion of our hopes.)

            // This allow and the Err can be removed once 1.82 becomes stable
            #[allow(unreachable_patterns)]
            Err(never) => match never {},
        }
    }
}

//! Storage contains types for storing data for the currently executing contract.
use core::fmt::Debug;

use crate::{
    env::internal::{self, StorageType, Val},
    unwrap::{UnwrapInfallible, UnwrapOptimized},
    Env, IntoVal, TryFromVal,
};

/// Storage stores and retrieves data for the currently executing contract.
///
/// All data stored can only be queried and modified by the contract that stores
/// it. Contracts cannot query or modify data stored by other contracts.
///
/// There are three types of storage - Temporary, Persistent, and Instance.
///
/// Temporary entries are the cheaper storage option and are never in the Expired State Stack (ESS). Whenever
/// a TemporaryEntry expires, the entry is permanently deleted and cannot be recovered.
/// This storage type is best for entries that are only relevant for short periods of
/// time or for entries that can be arbitrarily recreated.
///
/// Persistent entries are the more expensive storage type. Whenever
/// a persistent entry expires, it is deleted from the ledger, sent to the ESS
/// and can be recovered via an operation in Stellar Core. Only a single version of a
/// persistent entry can exist at a time.
///
/// Instance storage is used to store entries within the Persistent contract
/// instance entry, allowing users to tie that data directly to the TTL
/// of the instance. Instance storage is good for global contract data like
/// metadata, admin accounts, or pool reserves.
///
/// ### Examples
///
/// ```
/// use soroban_sdk::{Env, Symbol};
///
/// # use soroban_sdk::{contract, contractimpl, symbol_short, BytesN};
/// #
/// # #[contract]
/// # pub struct Contract;
/// #
/// # #[contractimpl]
/// # impl Contract {
/// #     pub fn f(env: Env) {
/// let storage = env.storage();
/// let key = symbol_short!("key");
/// storage.persistent().set(&key, &1);
/// assert_eq!(storage.persistent().has(&key), true);
/// assert_eq!(storage.persistent().get::<_, i32>(&key), Some(1));
/// #     }
/// # }
/// #
/// # #[cfg(feature = "testutils")]
/// # fn main() {
/// #     let env = Env::default();
/// #     let contract_id = env.register(Contract, ());
/// #     ContractClient::new(&env, &contract_id).f();
/// # }
/// # #[cfg(not(feature = "testutils"))]
/// # fn main() { }
/// ```
#[derive(Clone)]
pub struct Storage {
    env: Env,
}

impl Debug for Storage {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "Storage")
    }
}

impl Storage {
    #[inline(always)]
    pub(crate) fn new(env: &Env) -> Storage {
        Storage { env: env.clone() }
    }

    /// Storage for data that can stay in the ledger forever until deleted.
    ///
    /// Persistent entries might expire and be removed from the ledger if they run out
    /// of the rent balance. However, expired entries can be restored and
    /// they cannot be recreated. This means these entries
    /// behave 'as if' they were stored in the ledger forever.
    ///
    /// This should be used for data that requires persistency, such as token
    /// balances, user properties etc.
    pub fn persistent(&self) -> Persistent {
        assert_in_contract!(self.env);

        Persistent {
            storage: self.clone(),
        }
    }

    /// Storage for data that may stay in ledger only for a limited amount of
    /// time.
    ///
    /// Temporary storage is cheaper than Persistent storage.
    ///
    /// Temporary entries will be removed from the ledger after their lifetime
    /// ends. Removed entries can be created again, potentially with different
    /// values.
    ///
    /// This should be used for data that needs to only exist for a limited
    /// period of time, such as oracle data, claimable balances, offer, etc.
    pub fn temporary(&self) -> Temporary {
        assert_in_contract!(self.env);

        Temporary {
            storage: self.clone(),
        }
    }

    /// Storage for a **small amount** of persistent data associated with
    /// the current contract's instance.
    ///
    /// Storing a small amount of frequently used data in instance storage is
    /// likely cheaper than storing it separately in Persistent storage.
    ///
    /// Instance storage is tightly coupled with the contract instance: it will
    /// be loaded from the ledger every time the contract instance itself is
    /// loaded. It also won't appear in the ledger footprint. *All*
    /// the data stored in the instance storage is read from ledger every time
    /// the contract is used and it doesn't matter whether contract uses the
    /// storage or not.
    ///
    /// This has the same lifetime properties as Persistent storage, i.e.
    /// the data semantically stays in the ledger forever and can be
    /// expired/restored.
    ///
    /// The amount of data that can be stored in the instance storage is limited
    /// by the ledger entry size (a network-defined parameter). It is
    /// in the order of 100 KB serialized.
    ///
    /// This should be used for small data directly associated with the current
    /// contract, such as its admin, configuration settings, tokens the contract
    /// operates on etc. Do not use this with any data that can scale in
    /// unbounded fashion (such as user balances).
    pub fn instance(&self) -> Instance {
        assert_in_contract!(self.env);

        Instance {
            storage: self.clone(),
        }
    }

    /// Returns the maximum time-to-live (TTL) for all the Soroban ledger entries.
    ///
    /// TTL is the number of ledgers left until the instance entry is considered
    /// expired, excluding the current ledger. Maximum TTL represents the maximum
    /// possible TTL of an entry and maximum extension via `extend_ttl` methods.
    pub fn max_ttl(&self) -> u32 {
        let seq = self.env.ledger().sequence();
        let max = self.env.ledger().max_live_until_ledger();
        max - seq
    }

    /// Returns if there is a value stored for the given key in the currently
    /// executing contracts storage.
    #[inline(always)]
    pub(crate) fn has<K>(&self, key: &K, storage_type: StorageType) -> bool
    where
        K: IntoVal<Env, Val>,
    {
        self.has_internal(key.into_val(&self.env), storage_type)
    }

    /// Returns the value stored for the given key in the currently executing
    /// contract's storage, when present.
    ///
    /// Returns `None` when the value is missing.
    ///
    /// If the value is present, then the returned value will be a result of
    /// converting the internal value representation to `V`, or will panic if
    /// the conversion to `V` fails.
    #[inline(always)]
    pub(crate) fn get<K, V>(&self, key: &K, storage_type: StorageType) -> Option<V>
    where
        K: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        let key = key.into_val(&self.env);
        if self.has_internal(key, storage_type) {
            let rv = self.get_internal(key, storage_type);
            Some(V::try_from_val(&self.env, &rv).unwrap_optimized())
        } else {
            None
        }
    }

    /// Returns the value there is a value stored for the given key in the
    /// currently executing contract's storage.
    ///
    /// The returned value is a result of converting the internal value
    pub(crate) fn set<K, V>(&self, key: &K, val: &V, storage_type: StorageType)
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
    {
        let env = &self.env;
        internal::Env::put_contract_data(env, key.into_val(env), val.into_val(env), storage_type)
            .unwrap_infallible();
    }

    /// Update a value stored against a key.
    ///
    /// Loads the value, calls the function with it, then sets the value to the
    /// returned value of the function.  If no value is stored with the key then
    /// the function is called with None.
    ///
    /// The returned value is the value stored after updating.
    pub(crate) fn update<K, V>(
        &self,
        key: &K,
        storage_type: StorageType,
        f: impl FnOnce(Option<V>) -> V,
    ) -> V
    where
        K: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
        V: IntoVal<Env, Val>,
    {
        let key = key.into_val(&self.env);
        let val = self.get(&key, storage_type);
        let val = f(val);
        self.set(&key, &val, storage_type);
        val
    }

    /// Update a value stored against a key.
    ///
    /// Loads the value, calls the function with it, then sets the value to the
    /// returned value of the function.  If no value is stored with the key then
    /// the function is called with None.  If the function returns an error it
    /// will be passed through.
    ///
    /// The returned value is the value stored after updating.
    pub(crate) fn try_update<K, V, E>(
        &self,
        key: &K,
        storage_type: StorageType,
        f: impl FnOnce(Option<V>) -> Result<V, E>,
    ) -> Result<V, E>
    where
        K: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
        V: IntoVal<Env, Val>,
    {
        let key = key.into_val(&self.env);
        let val = self.get(&key, storage_type);
        let val = f(val)?;
        self.set(&key, &val, storage_type);
        Ok(val)
    }

    pub(crate) fn extend_ttl<K>(
        &self,
        key: &K,
        storage_type: StorageType,
        threshold: u32,
        extend_to: u32,
    ) where
        K: IntoVal<Env, Val>,
    {
        let env = &self.env;
        internal::Env::extend_contract_data_ttl(
            env,
            key.into_val(env),
            storage_type,
            threshold.into(),
            extend_to.into(),
        )
        .unwrap_infallible();
    }

    /// Removes the key and the corresponding value from the currently executing
    /// contract's storage.
    ///
    /// No-op if the key does not exist.
    #[inline(always)]
    pub(crate) fn remove<K>(&self, key: &K, storage_type: StorageType)
    where
        K: IntoVal<Env, Val>,
    {
        let env = &self.env;
        internal::Env::del_contract_data(env, key.into_val(env), storage_type).unwrap_infallible();
    }

    fn has_internal(&self, key: Val, storage_type: StorageType) -> bool {
        internal::Env::has_contract_data(&self.env, key, storage_type)
            .unwrap_infallible()
            .into()
    }

    fn get_internal(&self, key: Val, storage_type: StorageType) -> Val {
        internal::Env::get_contract_data(&self.env, key, storage_type).unwrap_infallible()
    }
}

pub struct Persistent {
    storage: Storage,
}

impl Persistent {
    pub fn has<K>(&self, key: &K) -> bool
    where
        K: IntoVal<Env, Val>,
    {
        self.storage.has(key, StorageType::Persistent)
    }

    pub fn get<K, V>(&self, key: &K) -> Option<V>
    where
        V::Error: Debug,
        K: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.get(key, StorageType::Persistent)
    }

    pub fn set<K, V>(&self, key: &K, val: &V)
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
    {
        self.storage.set(key, val, StorageType::Persistent)
    }

    /// Update a value stored against a key.
    ///
    /// Loads the value, calls the function with it, then sets the value to the
    /// returned value of the function.  If no value is stored with the key then
    /// the function is called with None.
    ///
    /// The returned value is the value stored after updating.
    pub fn update<K, V>(&self, key: &K, f: impl FnOnce(Option<V>) -> V) -> V
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.update(key, StorageType::Persistent, f)
    }

    /// Update a value stored against a key.
    ///
    /// Loads the value, calls the function with it, then sets the value to the
    /// returned value of the function.  If no value is stored with the key then
    /// the function is called with None.  If the function returns an error it
    /// will be passed through.
    ///
    /// The returned value is the value stored after updating.
    pub fn try_update<K, V, E>(
        &self,
        key: &K,
        f: impl FnOnce(Option<V>) -> Result<V, E>,
    ) -> Result<V, E>
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.try_update(key, StorageType::Persistent, f)
    }

    /// Extend the TTL of the data under the key.
    ///
    /// Extends the TTL only if the TTL for the provided data is below `threshold` ledgers.
    /// The TTL will then become `extend_to`.
    ///
    /// The TTL is the number of ledgers between the current ledger and the final ledger the data can still be accessed.
    pub fn extend_ttl<K>(&self, key: &K, threshold: u32, extend_to: u32)
    where
        K: IntoVal<Env, Val>,
    {
        self.storage
            .extend_ttl(key, StorageType::Persistent, threshold, extend_to)
    }

    #[inline(always)]
    pub fn remove<K>(&self, key: &K)
    where
        K: IntoVal<Env, Val>,
    {
        self.storage.remove(key, StorageType::Persistent)
    }
}

pub struct Temporary {
    storage: Storage,
}

impl Temporary {
    pub fn has<K>(&self, key: &K) -> bool
    where
        K: IntoVal<Env, Val>,
    {
        self.storage.has(key, StorageType::Temporary)
    }

    pub fn get<K, V>(&self, key: &K) -> Option<V>
    where
        V::Error: Debug,
        K: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.get(key, StorageType::Temporary)
    }

    pub fn set<K, V>(&self, key: &K, val: &V)
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
    {
        self.storage.set(key, val, StorageType::Temporary)
    }

    /// Update a value stored against a key.
    ///
    /// Loads the value, calls the function with it, then sets the value to the
    /// returned value of the function.  If no value is stored with the key then
    /// the function is called with None.
    ///
    /// The returned value is the value stored after updating.
    pub fn update<K, V>(&self, key: &K, f: impl FnOnce(Option<V>) -> V) -> V
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.update(key, StorageType::Temporary, f)
    }

    /// Update a value stored against a key.
    ///
    /// Loads the value, calls the function with it, then sets the value to the
    /// returned value of the function.  If no value is stored with the key then
    /// the function is called with None.  If the function returns an error it
    /// will be passed through.
    ///
    /// The returned value is the value stored after updating.
    pub fn try_update<K, V, E>(
        &self,
        key: &K,
        f: impl FnOnce(Option<V>) -> Result<V, E>,
    ) -> Result<V, E>
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.try_update(key, StorageType::Temporary, f)
    }

    /// Extend the TTL of the data under the key.
    ///
    /// Extends the TTL only if the TTL for the provided data is below `threshold` ledgers.
    /// The TTL will then become `extend_to`.
    ///
    /// The TTL is the number of ledgers between the current ledger and the final ledger the data can still be accessed.
    pub fn extend_ttl<K>(&self, key: &K, threshold: u32, extend_to: u32)
    where
        K: IntoVal<Env, Val>,
    {
        self.storage
            .extend_ttl(key, StorageType::Temporary, threshold, extend_to)
    }

    #[inline(always)]
    pub fn remove<K>(&self, key: &K)
    where
        K: IntoVal<Env, Val>,
    {
        self.storage.remove(key, StorageType::Temporary)
    }
}

pub struct Instance {
    storage: Storage,
}

impl Instance {
    pub fn has<K>(&self, key: &K) -> bool
    where
        K: IntoVal<Env, Val>,
    {
        self.storage.has(key, StorageType::Instance)
    }

    pub fn get<K, V>(&self, key: &K) -> Option<V>
    where
        V::Error: Debug,
        K: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.get(key, StorageType::Instance)
    }

    pub fn set<K, V>(&self, key: &K, val: &V)
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
    {
        self.storage.set(key, val, StorageType::Instance)
    }

    /// Update a value stored against a key.
    ///
    /// Loads the value, calls the function with it, then sets the value to the
    /// returned value of the function.  If no value is stored with the key then
    /// the function is called with None.
    ///
    /// The returned value is the value stored after updating.
    pub fn update<K, V>(&self, key: &K, f: impl FnOnce(Option<V>) -> V) -> V
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.update(key, StorageType::Instance, f)
    }

    /// Update a value stored against a key.
    ///
    /// Loads the value, calls the function with it, then sets the value to the
    /// returned value of the function.  If no value is stored with the key then
    /// the function is called with None.  If the function returns an error it
    /// will be passed through.
    ///
    /// The returned value is the value stored after updating.
    pub fn try_update<K, V, E>(
        &self,
        key: &K,
        f: impl FnOnce(Option<V>) -> Result<V, E>,
    ) -> Result<V, E>
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        self.storage.try_update(key, StorageType::Instance, f)
    }

    #[inline(always)]
    pub fn remove<K>(&self, key: &K)
    where
        K: IntoVal<Env, Val>,
    {
        self.storage.remove(key, StorageType::Instance)
    }

    /// Extend the TTL of the contract instance and code.
    ///
    /// Extends the TTL of the instance and code only if the TTL for the provided contract is below `threshold` ledgers.
    /// The TTL will then become `extend_to`. Note that the `threshold` check and TTL extensions are done for both the
    /// contract code and contract instance, so it's possible that one is bumped but not the other depending on what the
    /// current TTL's are.
    ///
    /// The TTL is the number of ledgers between the current ledger and the final ledger the data can still be accessed.
    pub fn extend_ttl(&self, threshold: u32, extend_to: u32) {
        internal::Env::extend_current_contract_instance_and_code_ttl(
            &self.storage.env,
            threshold.into(),
            extend_to.into(),
        )
        .unwrap_infallible();
    }
}

#[cfg(any(test, feature = "testutils"))]
#[cfg_attr(feature = "docs", doc(cfg(feature = "testutils")))]
mod testutils {
    use super::*;
    use crate::{testutils, xdr, Map, TryIntoVal};

    impl testutils::storage::Instance for Instance {
        fn all(&self) -> Map<Val, Val> {
            let env = &self.storage.env;
            let storage = env.host().with_mut_storage(|s| Ok(s.map.clone())).unwrap();
            let address: xdr::ScAddress = env.current_contract_address().try_into().unwrap();
            for entry in storage {
                let (k, Some((v, _))) = entry else {
                    continue;
                };
                let xdr::LedgerKey::ContractData(xdr::LedgerKeyContractData {
                    ref contract, ..
                }) = *k
                else {
                    continue;
                };
                if contract != &address {
                    continue;
                }
                let xdr::LedgerEntry {
                    data:
                        xdr::LedgerEntryData::ContractData(xdr::ContractDataEntry {
                            key: xdr::ScVal::LedgerKeyContractInstance,
                            val:
                                xdr::ScVal::ContractInstance(xdr::ScContractInstance {
                                    ref storage,
                                    ..
                                }),
                            ..
                        }),
                    ..
                } = *v
                else {
                    continue;
                };
                return match storage {
                    Some(map) => {
                        let map: Val =
                            Val::try_from_val(env, &xdr::ScVal::Map(Some(map.clone()))).unwrap();
                        map.try_into_val(env).unwrap()
                    }
                    None => Map::new(env),
                };
            }
            panic!("contract instance for current contract address not found");
        }

        fn get_ttl(&self) -> u32 {
            let env = &self.storage.env;
            env.host()
                .get_contract_instance_live_until_ledger(env.current_contract_address().to_object())
                .unwrap()
                .checked_sub(env.ledger().sequence())
                .unwrap()
        }
    }

    impl testutils::storage::Persistent for Persistent {
        fn all(&self) -> Map<Val, Val> {
            all(&self.storage.env, xdr::ContractDataDurability::Persistent)
        }

        fn get_ttl<K: IntoVal<Env, Val>>(&self, key: &K) -> u32 {
            let env = &self.storage.env;
            env.host()
                .get_contract_data_live_until_ledger(key.into_val(env), StorageType::Persistent)
                .unwrap()
                .checked_sub(env.ledger().sequence())
                .unwrap()
        }
    }

    impl testutils::storage::Temporary for Temporary {
        fn all(&self) -> Map<Val, Val> {
            all(&self.storage.env, xdr::ContractDataDurability::Temporary)
        }

        fn get_ttl<K: IntoVal<Env, Val>>(&self, key: &K) -> u32 {
            let env = &self.storage.env;
            env.host()
                .get_contract_data_live_until_ledger(key.into_val(env), StorageType::Temporary)
                .unwrap()
                .checked_sub(env.ledger().sequence())
                .unwrap()
        }
    }

    fn all(env: &Env, d: xdr::ContractDataDurability) -> Map<Val, Val> {
        let storage = env.host().with_mut_storage(|s| Ok(s.map.clone())).unwrap();
        let mut map = Map::<Val, Val>::new(env);
        for entry in storage {
            let (_, Some((v, _))) = entry else {
                continue;
            };
            let xdr::LedgerEntry {
                data:
                    xdr::LedgerEntryData::ContractData(xdr::ContractDataEntry {
                        ref key,
                        ref val,
                        durability,
                        ..
                    }),
                ..
            } = *v
            else {
                continue;
            };
            if d != durability {
                continue;
            }
            let Ok(key) = Val::try_from_val(env, key) else {
                continue;
            };
            let Ok(val) = Val::try_from_val(env, val) else {
                continue;
            };
            map.set(key, val);
        }
        map
    }
}

//! Auth contains types for building custom account contracts.

use crate::{contracttype, crypto::Hash, Address, BytesN, Env, Error, Symbol, Val, Vec};

/// Context of a single authorized call performed by an address.
///
/// Custom account contracts that implement `__check_auth` special function
/// receive a list of `Context` values corresponding to all the calls that
/// need to be authorized.
#[derive(Clone)]
#[contracttype(crate_path = "crate", export = false)]
pub enum Context {
    /// Contract invocation.
    Contract(ContractContext),
    /// Contract that has a constructor with no arguments is created.
    CreateContractHostFn(CreateContractHostFnContext),
    /// Contract that has a constructor with 1 or more arguments is created.
    CreateContractWithCtorHostFn(CreateContractWithConstructorHostFnContext),
}

/// Authorization context of a single contract call.
///
/// This struct corresponds to a `require_auth_for_args` call for an address
/// from `contract` function with `fn_name` name and `args` arguments.
#[derive(Clone)]
#[contracttype(crate_path = "crate", export = false)]
pub struct ContractContext {
    pub contract: Address,
    pub fn_name: Symbol,
    pub args: Vec<Val>,
}

/// Authorization context for `create_contract` host function that creates a
/// new contract on behalf of authorizer address.
#[derive(Clone)]
#[contracttype(crate_path = "crate", export = false)]
pub struct CreateContractHostFnContext {
    pub executable: ContractExecutable,
    pub salt: BytesN<32>,
}

/// Authorization context for `create_contract` host function that creates a
/// new contract on behalf of authorizer address.
/// This is the same as `CreateContractHostFnContext`, but also has
/// contract constructor arguments.
#[derive(Clone)]
#[contracttype(crate_path = "crate", export = false)]
pub struct CreateContractWithConstructorHostFnContext {
    pub executable: ContractExecutable,
    pub salt: BytesN<32>,
    pub constructor_args: Vec<Val>,
}

/// Contract executable used for creating a new contract and used in
/// `CreateContractHostFnContext`.
#[derive(Clone)]
#[contracttype(crate_path = "crate", export = false)]
pub enum ContractExecutable {
    Wasm(BytesN<32>),
}

/// A node in the tree of authorizations performed on behalf of the current
/// contract as invoker of the contracts deeper in the call stack.
///
/// This is used as an argument of `authorize_as_current_contract` host function.
///
/// This tree corresponds `require_auth[_for_args]` calls on behalf of the
/// current contract.
#[derive(Clone)]
#[contracttype(crate_path = "crate", export = false)]
pub enum InvokerContractAuthEntry {
    /// Invoke a contract.
    Contract(SubContractInvocation),
    /// Create a contract passing 0 arguments to constructor.
    CreateContractHostFn(CreateContractHostFnContext),
    /// Create a contract passing 0 or more arguments to constructor.
    CreateContractWithCtorHostFn(CreateContractWithConstructorHostFnContext),
}

/// Value of contract node in InvokerContractAuthEntry tree.
#[derive(Clone)]
#[contracttype(crate_path = "crate", export = false)]
pub struct SubContractInvocation {
    pub context: ContractContext,
    pub sub_invocations: Vec<InvokerContractAuthEntry>,
}

/// Custom account interface that a contract implements to support being used
/// as a custom account for auth.
///
/// Once a contract implements the interface, call to [`Address::require_auth`]
/// for the contract's address will call its `__check_auth` implementation.
pub trait CustomAccountInterface {
    type Signature;
    type Error: Into<Error>;

    /// Check that the signatures and auth contexts are valid.
    fn __check_auth(
        env: Env,
        signature_payload: Hash<32>,
        signatures: Self::Signature,
        auth_contexts: Vec<Context>,
    ) -> Result<(), Self::Error>;
}

//! Crypto contains functions for cryptographic functions.

use crate::{
    env::internal::{self, BytesObject},
    unwrap::UnwrapInfallible,
    Bytes, BytesN, ConversionError, Env, IntoVal, TryFromVal, Val,
};

pub mod bls12_381;
/// A `BytesN<N>` generated by a cryptographic hash function.
///
/// The `Hash<N>` type contains a `BytesN<N>` and can only be constructed in
/// contexts where the value has been generated by a secure cryptographic
/// function. As a result, the type is only found as a return value of calling
/// [`sha256`][Crypto::sha256], [`keccak256`][Crypto::keccak256], or via
/// implementing [`CustomAccountInterface`][crate::auth::CustomAccountInterface]
/// since the `__check_auth` is guaranteed to receive a hash from a secure
/// cryptographic hash function as its first parameter.
///
/// **__Note:_** A Hash should not be used with storage, since no guarantee can
/// be made about the Bytes stored as to whether they were in fact from a secure
/// cryptographic hash function.
#[derive(Clone)]
#[repr(transparent)]
pub struct Hash<const N: usize>(BytesN<N>);

impl<const N: usize> Hash<N> {
    /// Constructs a new `Hash` from a fixed-length bytes array.
    ///
    /// This is intended for test-only, since `Hash` type is only meant to be
    /// constructed via secure manners.
    #[cfg(test)]
    pub(crate) fn from_bytes(bytes: BytesN<N>) -> Self {
        Self(bytes)
    }

    /// Returns a [`BytesN`] containing the bytes in this hash.
    #[inline(always)]
    pub fn to_bytes(&self) -> BytesN<N> {
        self.0.clone()
    }

    /// Returns an array containing the bytes in this hash.
    #[inline(always)]
    pub fn to_array(&self) -> [u8; N] {
        self.0.to_array()
    }

    pub fn as_val(&self) -> &Val {
        self.0.as_val()
    }

    pub fn to_val(&self) -> Val {
        self.0.to_val()
    }

    pub fn as_object(&self) -> &BytesObject {
        self.0.as_object()
    }

    pub fn to_object(&self) -> BytesObject {
        self.0.to_object()
    }
}

impl<const N: usize> IntoVal<Env, Val> for Hash<N> {
    fn into_val(&self, e: &Env) -> Val {
        self.0.into_val(e)
    }
}

impl<const N: usize> IntoVal<Env, BytesN<N>> for Hash<N> {
    fn into_val(&self, _e: &Env) -> BytesN<N> {
        self.0.clone()
    }
}

impl<const N: usize> From<Hash<N>> for Bytes {
    fn from(v: Hash<N>) -> Self {
        v.0.into()
    }
}

impl<const N: usize> From<Hash<N>> for BytesN<N> {
    fn from(v: Hash<N>) -> Self {
        v.0
    }
}

impl<const N: usize> Into<[u8; N]> for Hash<N> {
    fn into(self) -> [u8; N] {
        self.0.into()
    }
}

#[allow(deprecated)]
impl<const N: usize> crate::TryFromValForContractFn<Env, Val> for Hash<N> {
    type Error = ConversionError;

    fn try_from_val_for_contract_fn(env: &Env, v: &Val) -> Result<Self, Self::Error> {
        Ok(Hash(BytesN::<N>::try_from_val(env, v)?))
    }
}

/// Crypto provides access to cryptographic functions.
pub struct Crypto {
    env: Env,
}

impl Crypto {
    pub(crate) fn new(env: &Env) -> Crypto {
        Crypto { env: env.clone() }
    }

    pub fn env(&self) -> &Env {
        &self.env
    }

    /// Returns the SHA-256 hash of the data.
    pub fn sha256(&self, data: &Bytes) -> Hash<32> {
        let env = self.env();
        let bin = internal::Env::compute_hash_sha256(env, data.into()).unwrap_infallible();
        unsafe { Hash(BytesN::unchecked_new(env.clone(), bin)) }
    }

    /// Returns the Keccak-256 hash of the data.
    pub fn keccak256(&self, data: &Bytes) -> Hash<32> {
        let env = self.env();
        let bin = internal::Env::compute_hash_keccak256(env, data.into()).unwrap_infallible();
        unsafe { Hash(BytesN::unchecked_new(env.clone(), bin)) }
    }

    /// Verifies an ed25519 signature.
    ///
    /// The signature is verified as a valid signature of the message by the
    /// ed25519 public key.
    ///
    /// ### Panics
    ///
    /// If the signature verification fails.
    pub fn ed25519_verify(&self, public_key: &BytesN<32>, message: &Bytes, signature: &BytesN<64>) {
        let env = self.env();
        let _ = internal::Env::verify_sig_ed25519(
            env,
            public_key.to_object(),
            message.to_object(),
            signature.to_object(),
        );
    }

    /// Recovers the ECDSA secp256k1 public key.
    ///
    /// The public key returned is the SEC-1-encoded ECDSA secp256k1 public key
    /// that produced the 64-byte signature over a given 32-byte message digest,
    /// for a given recovery_id byte.
    pub fn secp256k1_recover(
        &self,
        message_digest: &Hash<32>,
        signature: &BytesN<64>,
        recorvery_id: u32,
    ) -> BytesN<65> {
        let env = self.env();
        CryptoHazmat::new(env).secp256k1_recover(&message_digest.0, signature, recorvery_id)
    }

    /// Verifies the ECDSA secp256r1 signature.
    ///
    /// The SEC-1-encoded public key is provided along with the message,
    /// verifies the 64-byte signature.
    pub fn secp256r1_verify(
        &self,
        public_key: &BytesN<65>,
        message_digest: &Hash<32>,
        signature: &BytesN<64>,
    ) {
        let env = self.env();
        CryptoHazmat::new(env).secp256r1_verify(public_key, &message_digest.0, signature)
    }

    /// Get a [Bls12_381][bls12_381::Bls12_381] for accessing the bls12-381
    /// functions.
    pub fn bls12_381(&self) -> bls12_381::Bls12_381 {
        bls12_381::Bls12_381::new(self.env())
    }
}

/// # ⚠️ Hazardous Materials
///
/// Cryptographic functions under [CryptoHazmat] are low-leveled which can be
/// insecure if misused. They are not generally recommended. Using them
/// incorrectly can introduce security vulnerabilities. Please use [Crypto] if
/// possible.
#[cfg(any(test, feature = "hazmat"))]
#[cfg_attr(feature = "docs", doc(cfg(feature = "hazmat")))]
pub struct CryptoHazmat {
    env: Env,
}
#[cfg(not(any(test, feature = "hazmat")))]
pub(crate) struct CryptoHazmat {
    env: Env,
}

impl CryptoHazmat {
    pub(crate) fn new(env: &Env) -> CryptoHazmat {
        CryptoHazmat { env: env.clone() }
    }

    pub fn env(&self) -> &Env {
        &self.env
    }

    /// Recovers the ECDSA secp256k1 public key.
    ///
    /// The public key returned is the SEC-1-encoded ECDSA secp256k1 public key
    /// that produced the 64-byte signature over a given 32-byte message digest,
    /// for a given recovery_id byte.
    ///
    /// WARNING: The `message_digest` must be produced by a secure cryptographic
    /// hash function on the message, otherwise the attacker can potentially
    /// forge signatures.
    pub fn secp256k1_recover(
        &self,
        message_digest: &BytesN<32>,
        signature: &BytesN<64>,
        recorvery_id: u32,
    ) -> BytesN<65> {
        let env = self.env();
        let bytes = internal::Env::recover_key_ecdsa_secp256k1(
            env,
            message_digest.to_object(),
            signature.to_object(),
            recorvery_id.into(),
        )
        .unwrap_infallible();
        unsafe { BytesN::unchecked_new(env.clone(), bytes) }
    }

    /// Verifies the ECDSA secp256r1 signature.
    ///
    /// The SEC-1-encoded public key is provided along with a 32-byte message
    /// digest, verifies the 64-byte signature.
    ///
    /// WARNING: The `message_digest` must be produced by a secure cryptographic
    /// hash function on the message, otherwise the attacker can potentially
    /// forge signatures.
    pub fn secp256r1_verify(
        &self,
        public_key: &BytesN<65>,
        message_digest: &BytesN<32>,
        signature: &BytesN<64>,
    ) {
        let env = self.env();
        let _ = internal::Env::verify_sig_ecdsa_secp256r1(
            env,
            public_key.to_object(),
            message_digest.to_object(),
            signature.to_object(),
        )
        .unwrap_infallible();
    }
}

//! Deploy contains types for deploying contracts.
//!
//! Contracts are assigned an ID that is derived from a set of arguments. A
//! contract may choose which set of arguments to use to deploy with:
//!
//! - [Deployer::with_current_contract] – A contract deployed by the currently
//! executing contract will have an ID derived from the currently executing
//! contract's ID.
//!
//! The deployer can be created using [Env::deployer].
//!
//! ### Examples
//!
//! #### Deploy a contract without constructor (or 0-argument constructor)
//!
//! ```
//! use soroban_sdk::{contract, contractimpl, BytesN, Env, Symbol};
//!
//! const DEPLOYED_WASM: &[u8] = include_bytes!("../doctest_fixtures/contract.wasm");
//!
//! #[contract]
//! pub struct Contract;
//!
//! #[contractimpl]
//! impl Contract {
//!     pub fn deploy(env: Env, wasm_hash: BytesN<32>) {
//!         let salt = [0u8; 32];
//!         let deployer = env.deployer().with_current_contract(salt);
//!         let contract_address = deployer.deploy_v2(wasm_hash, ());
//!         // ...
//!     }
//! }
//!
//! #[test]
//! fn test() {
//! # }
//! # #[cfg(feature = "testutils")]
//! # fn main() {
//!     let env = Env::default();
//!     let contract_address = env.register(Contract, ());
//!     let contract = ContractClient::new(&env, &contract_address);
//!     // Upload the contract code before deploying its instance.
//!     let wasm_hash = env.deployer().upload_contract_wasm(DEPLOYED_WASM);
//!     contract.deploy(&wasm_hash);
//! }
//! # #[cfg(not(feature = "testutils"))]
//! # fn main() { }
//! ```
//!
//! #### Deploy a contract with a multi-argument constructor
//!
//! ```
//! use soroban_sdk::{contract, contractimpl, BytesN, Env, Symbol, IntoVal};
//!
//! const DEPLOYED_WASM_WITH_CTOR: &[u8] = include_bytes!("../doctest_fixtures/contract_with_constructor.wasm");
//!
//! #[contract]
//! pub struct Contract;
//!
//! #[contractimpl]
//! impl Contract {
//!     pub fn deploy_with_constructor(env: Env, wasm_hash: BytesN<32>) {
//!         let salt = [1u8; 32];
//!         let deployer = env.deployer().with_current_contract(salt);
//!         let contract_address = deployer.deploy_v2(
//!              wasm_hash,
//!              (1_u32, 2_i64),
//!         );
//!         // ...
//!     }
//! }
//!
//! #[test]
//! fn test() {
//! # }
//! # #[cfg(feature = "testutils")]
//! # fn main() {
//!     let env = Env::default();
//!     let contract_address = env.register(Contract, ());
//!     let contract = ContractClient::new(&env, &contract_address);
//!     // Upload the contract code before deploying its instance.
//!     let wasm_hash = env.deployer().upload_contract_wasm(DEPLOYED_WASM_WITH_CTOR);
//!     contract.deploy_with_constructor(&wasm_hash);
//! }
//! # #[cfg(not(feature = "testutils"))]
//! # fn main() { }
//! ```
//!
//! #### Derive before deployment what the address of a contract will be
//!
//! ```
//! use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Symbol, IntoVal};
//!
//! #[contract]
//! pub struct Contract;
//!
//! #[contractimpl]
//! impl Contract {
//!     pub fn deploy_contract_address(env: Env) -> Address {
//!         let salt = [1u8; 32];
//!         let deployer = env.deployer().with_current_contract(salt);
//!         // Deployed contract address is deterministic and can be accessed
//!         // before deploying the contract. It is derived from the deployer
//!         // (the current contract's address) and the salt passed in above.
//!         deployer.deployed_address()
//!     }
//! }
//!
//! #[test]
//! fn test() {
//! # }
//! # #[cfg(feature = "testutils")]
//! # fn main() {
//!     let env = Env::default();
//!     let contract_address = env.register(Contract, ());
//!     let contract = ContractClient::new(&env, &contract_address);
//!     assert_eq!(
//!         contract.deploy_contract_address(),
//!         Address::from_str(&env, "CBESJIMX7J53SWJGJ7WQ6QTLJI4S5LPPJNC2BNVD63GIKAYCDTDOO322"),
//!     );
//! }
//! # #[cfg(not(feature = "testutils"))]
//! # fn main() { }
//! ```

use crate::{
    env::internal::Env as _, unwrap::UnwrapInfallible, Address, Bytes, BytesN, ConstructorArgs,
    Env, IntoVal,
};

/// Deployer provides access to deploying contracts.
pub struct Deployer {
    env: Env,
}

impl Deployer {
    pub(crate) fn new(env: &Env) -> Deployer {
        Deployer { env: env.clone() }
    }

    pub fn env(&self) -> &Env {
        &self.env
    }

    /// Get a deployer that deploys contract that derive the contract IDs
    /// from the current contract and provided salt.
    pub fn with_current_contract(
        &self,
        salt: impl IntoVal<Env, BytesN<32>>,
    ) -> DeployerWithAddress {
        DeployerWithAddress {
            env: self.env.clone(),
            address: self.env.current_contract_address(),
            salt: salt.into_val(&self.env),
        }
    }

    /// Get a deployer that deploys contracts that derive the contract ID
    /// from the provided address and salt.
    ///
    /// The deployer address must authorize all the deployments.
    pub fn with_address(
        &self,
        address: Address,
        salt: impl IntoVal<Env, BytesN<32>>,
    ) -> DeployerWithAddress {
        DeployerWithAddress {
            env: self.env.clone(),
            address,
            salt: salt.into_val(&self.env),
        }
    }

    /// Get a deployer that deploys an instance of Stellar Asset Contract
    /// corresponding to the provided serialized asset.
    ///
    /// `serialized_asset` is the Stellar `Asset` XDR serialized to bytes. Refer
    /// to `[soroban_sdk::xdr::Asset]`
    pub fn with_stellar_asset(
        &self,
        serialized_asset: impl IntoVal<Env, Bytes>,
    ) -> DeployerWithAsset {
        DeployerWithAsset {
            env: self.env.clone(),
            serialized_asset: serialized_asset.into_val(&self.env),
        }
    }

    /// Upload the contract Wasm code to the network.
    ///
    /// Returns the hash of the uploaded Wasm that can be then used for
    /// the contract deployment.
    /// ### Examples
    /// ```
    /// use soroban_sdk::{BytesN, Env};
    ///
    /// const WASM: &[u8] = include_bytes!("../doctest_fixtures/contract.wasm");
    ///
    /// #[test]
    /// fn test() {
    /// # }
    /// # fn main() {
    ///     let env = Env::default();
    ///     env.deployer().upload_contract_wasm(WASM);
    /// }
    /// ```
    pub fn upload_contract_wasm(&self, contract_wasm: impl IntoVal<Env, Bytes>) -> BytesN<32> {
        self.env
            .upload_wasm(contract_wasm.into_val(&self.env).to_object())
            .unwrap_infallible()
            .into_val(&self.env)
    }

    /// Replaces the executable of the current contract with the provided Wasm.
    ///
    /// The Wasm blob identified by the `wasm_hash` has to be already present
    /// in the ledger (uploaded via `[Deployer::upload_contract_wasm]`).
    ///
    /// The function won't do anything immediately. The contract executable
    /// will only be updated after the invocation has successfully finished.
    pub fn update_current_contract_wasm(&self, wasm_hash: impl IntoVal<Env, BytesN<32>>) {
        self.env
            .update_current_contract_wasm(wasm_hash.into_val(&self.env).to_object())
            .unwrap_infallible();
    }

    /// Extend the TTL of the contract instance and code.
    ///
    /// Extends the TTL of the instance and code only if the TTL for the provided contract is below `threshold` ledgers.
    /// The TTL will then become `extend_to`. Note that the `threshold` check and TTL extensions are done for both the
    /// contract code and contract instance, so it's possible that one is bumped but not the other depending on what the
    /// current TTL's are.
    ///
    /// The TTL is the number of ledgers between the current ledger and the final ledger the data can still be accessed.
    pub fn extend_ttl(&self, contract_address: Address, threshold: u32, extend_to: u32) {
        self.env
            .extend_contract_instance_and_code_ttl(
                contract_address.to_object(),
                threshold.into(),
                extend_to.into(),
            )
            .unwrap_infallible();
    }

    /// Extend the TTL of the contract instance.
    ///
    /// Same as [`extend_ttl`](Self::extend_ttl) but only for contract instance.
    pub fn extend_ttl_for_contract_instance(
        &self,
        contract_address: Address,
        threshold: u32,
        extend_to: u32,
    ) {
        self.env
            .extend_contract_instance_ttl(
                contract_address.to_object(),
                threshold.into(),
                extend_to.into(),
            )
            .unwrap_infallible();
    }

    /// Extend the TTL of the contract code.
    ///
    /// Same as [`extend_ttl`](Self::extend_ttl) but only for contract code.
    pub fn extend_ttl_for_code(&self, contract_address: Address, threshold: u32, extend_to: u32) {
        self.env
            .extend_contract_code_ttl(
                contract_address.to_object(),
                threshold.into(),
                extend_to.into(),
            )
            .unwrap_infallible();
    }
}

/// A deployer that deploys a contract that has its ID derived from the provided
/// address and salt.
pub struct DeployerWithAddress {
    env: Env,
    address: Address,
    salt: BytesN<32>,
}

impl DeployerWithAddress {
    /// Return the address of the contract defined by the deployer.
    ///
    /// This function can be called at anytime, before or after the contract is
    /// deployed, because contract addresses are deterministic.
    pub fn deployed_address(&self) -> Address {
        self.env
            .get_contract_id(self.address.to_object(), self.salt.to_object())
            .unwrap_infallible()
            .into_val(&self.env)
    }

    /// Deploy a contract that uses Wasm executable with provided hash.
    ///
    /// The address of the deployed contract is defined by the deployer address
    /// and provided salt.
    ///
    /// Returns the deployed contract's address.
    #[deprecated(note = "use deploy_v2")]
    pub fn deploy(&self, wasm_hash: impl IntoVal<Env, BytesN<32>>) -> Address {
        let env = &self.env;
        let address_obj = env
            .create_contract(
                self.address.to_object(),
                wasm_hash.into_val(env).to_object(),
                self.salt.to_object(),
            )
            .unwrap_infallible();
        unsafe { Address::unchecked_new(env.clone(), address_obj) }
    }

    /// Deploy a contract that uses Wasm executable with provided hash.
    ///
    /// The constructor args will be passed to the contract's constructor. Pass
    /// `()` for contract's with no constructor or a constructor with zero
    /// arguments.
    ///
    /// The address of the deployed contract is defined by the deployer address
    /// and provided salt.
    ///
    /// Returns the deployed contract's address.
    pub fn deploy_v2<A>(
        &self,
        wasm_hash: impl IntoVal<Env, BytesN<32>>,
        constructor_args: A,
    ) -> Address
    where
        A: ConstructorArgs,
    {
        let env = &self.env;
        let address_obj = env
            .create_contract_with_constructor(
                self.address.to_object(),
                wasm_hash.into_val(env).to_object(),
                self.salt.to_object(),
                constructor_args.into_val(env).to_object(),
            )
            .unwrap_infallible();
        unsafe { Address::unchecked_new(env.clone(), address_obj) }
    }
}

pub struct DeployerWithAsset {
    env: Env,
    serialized_asset: Bytes,
}

impl DeployerWithAsset {
    /// Return the address of the contract defined by the deployer.
    ///
    /// This function can be called at anytime, before or after the contract is
    /// deployed, because contract addresses are deterministic.
    pub fn deployed_address(&self) -> Address {
        self.env
            .get_asset_contract_id(self.serialized_asset.to_object())
            .unwrap_infallible()
            .into_val(&self.env)
    }

    pub fn deploy(&self) -> Address {
        self.env
            .create_asset_contract(self.serialized_asset.to_object())
            .unwrap_infallible()
            .into_val(&self.env)
    }
}

#[cfg(any(test, feature = "testutils"))]
#[cfg_attr(feature = "docs", doc(cfg(feature = "testutils")))]
mod testutils {
    use crate::deploy::Deployer;
    use crate::Address;

    impl crate::testutils::Deployer for Deployer {
        fn get_contract_instance_ttl(&self, contract: &Address) -> u32 {
            self.env
                .host()
                .get_contract_instance_live_until_ledger(contract.to_object())
                .unwrap()
                .checked_sub(self.env.ledger().sequence())
                .unwrap()
        }

        fn get_contract_code_ttl(&self, contract: &Address) -> u32 {
            self.env
                .host()
                .get_contract_code_live_until_ledger(contract.to_object())
                .unwrap()
                .checked_sub(self.env.ledger().sequence())
                .unwrap()
        }
    }
}

//! Events contains types for publishing contract events.
use core::fmt::Debug;

#[cfg(doc)]
use crate::{contracttype, Bytes, Map};
use crate::{env::internal, unwrap::UnwrapInfallible, Env, IntoVal, Val, Vec};

// TODO: consolidate with host::events::TOPIC_BYTES_LENGTH_LIMIT
const TOPIC_BYTES_LENGTH_LIMIT: u32 = 32;

/// Events publishes events for the currently executing contract.
///
/// ```
/// use soroban_sdk::Env;
///
/// # use soroban_sdk::{contract, contractimpl, vec, map, Val, BytesN};
/// #
/// # #[contract]
/// # pub struct Contract;
/// #
/// # #[contractimpl]
/// # impl Contract {
/// #     pub fn f(env: Env) {
/// let event = env.events();
/// let data = map![&env, (1u32, 2u32)];
/// // topics can be represented with tuple up to a certain length
/// let topics0 = ();
/// let topics1 = (0u32,);
/// let topics2 = (0u32, 1u32);
/// let topics3 = (0u32, 1u32, 2u32);
/// let topics4 = (0u32, 1u32, 2u32, 3u32);
/// // topics can also be represented with a `Vec` with no length limit
/// let topics5 = vec![&env, 4u32, 5u32, 6u32, 7u32, 8u32];
/// event.publish(topics0, data.clone());
/// event.publish(topics1, data.clone());
/// event.publish(topics2, data.clone());
/// event.publish(topics3, data.clone());
/// event.publish(topics4, data.clone());
/// event.publish(topics5, data.clone());
/// #     }
/// # }
///
/// # #[cfg(feature = "testutils")]
/// # fn main() {
/// #     let env = Env::default();
/// #     let contract_id = env.register(Contract, ());
/// #     ContractClient::new(&env, &contract_id).f();
/// # }
/// # #[cfg(not(feature = "testutils"))]
/// # fn main() { }
/// ```
#[derive(Clone)]
pub struct Events(Env);

impl Debug for Events {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "Events")
    }
}

pub trait Topics: IntoVal<Env, Vec<Val>> {}

impl<T> Topics for Vec<T> {}

impl Events {
    #[inline(always)]
    pub(crate) fn env(&self) -> &Env {
        &self.0
    }

    #[inline(always)]
    pub(crate) fn new(env: &Env) -> Events {
        Events(env.clone())
    }

    /// Publish an event.
    ///
    /// Event data is specified in `data`. Data may be any value or
    /// type, including types defined by contracts using [contracttype].
    ///
    /// Event topics must not contain:
    ///
    /// - [Vec]
    /// - [Map]
    /// - [Bytes]/[BytesN][crate::BytesN] longer than 32 bytes
    /// - [contracttype]
    #[inline(always)]
    pub fn publish<T, D>(&self, topics: T, data: D)
    where
        T: Topics,
        D: IntoVal<Env, Val>,
    {
        let env = self.env();
        internal::Env::contract_event(env, topics.into_val(env).to_object(), data.into_val(env))
            .unwrap_infallible();
    }
}

#[cfg(any(test, feature = "testutils"))]
use crate::{testutils, xdr, Address, TryIntoVal};

#[cfg(any(test, feature = "testutils"))]
#[cfg_attr(feature = "docs", doc(cfg(feature = "testutils")))]
impl testutils::Events for Events {
    fn all(&self) -> Vec<(crate::Address, Vec<Val>, Val)> {
        let env = self.env();
        let mut vec = Vec::new(env);
        self.env()
            .host()
            .get_events()
            .unwrap()
            .0
            .into_iter()
            .for_each(|e| {
                if let xdr::ContractEvent {
                    type_: xdr::ContractEventType::Contract,
                    contract_id: Some(contract_id),
                    body: xdr::ContractEventBody::V0(xdr::ContractEventV0 { topics, data }),
                    ..
                } = e.event
                {
                    vec.push_back((
                        Address::from_contract_id(env, contract_id.0),
                        topics.try_into_val(env).unwrap(),
                        data.try_into_val(env).unwrap(),
                    ))
                }
            });
        vec
    }
}

//! Iterators for use with collections like [Map], [Vec].
#[cfg(doc)]
use crate::{Map, Vec};

use core::fmt::Debug;
use core::iter::FusedIterator;
use core::marker::PhantomData;

pub trait UnwrappedEnumerable<I, T, E> {
    fn unwrapped(self) -> UnwrappedIter<I, T, E>;
}

impl<I, T, E> UnwrappedEnumerable<I, T, E> for I
where
    I: Iterator<Item = Result<T, E>>,
    E: Debug,
{
    fn unwrapped(self) -> UnwrappedIter<I, T, E> {
        UnwrappedIter {
            iter: self,
            item_type: PhantomData,
            error_type: PhantomData,
        }
    }
}

#[derive(Clone)]
pub struct UnwrappedIter<I, T, E> {
    iter: I,
    item_type: PhantomData<T>,
    error_type: PhantomData<E>,
}

impl<I, T, E> Iterator for UnwrappedIter<I, T, E>
where
    I: Iterator<Item = Result<T, E>>,
    E: Debug,
{
    type Item = T;

    #[inline(always)]
    fn next(&mut self) -> Option<Self::Item> {
        self.iter.next().map(Result::unwrap)
    }

    #[inline(always)]
    fn size_hint(&self) -> (usize, Option<usize>) {
        self.iter.size_hint()
    }
}

impl<I, T, E> DoubleEndedIterator for UnwrappedIter<I, T, E>
where
    I: Iterator<Item = Result<T, E>> + DoubleEndedIterator,
    E: Debug,
{
    #[inline(always)]
    fn next_back(&mut self) -> Option<Self::Item> {
        self.iter.next_back().map(Result::unwrap)
    }
}

impl<I, T, E> FusedIterator for UnwrappedIter<I, T, E>
where
    I: Iterator<Item = Result<T, E>> + FusedIterator,
    E: Debug,
{
}

impl<I, T, E> ExactSizeIterator for UnwrappedIter<I, T, E>
where
    I: Iterator<Item = Result<T, E>> + ExactSizeIterator,
    E: Debug,
{
    #[inline(always)]
    fn len(&self) -> usize {
        self.iter.len()
    }
}

//! Ledger contains types for retrieving information about the current ledger.
use crate::{env::internal, unwrap::UnwrapInfallible, BytesN, Env, TryIntoVal};

/// Ledger retrieves information about the current ledger.
///
/// For more details about the ledger and the ledger header that the values in the Ledger are derived from, see:
///  - <https://developers.stellar.org/docs/learn/encyclopedia/network-configuration/ledger-headers>
///
/// ### Examples
///
/// ```
/// use soroban_sdk::Env;
///
/// # use soroban_sdk::{contract, contractimpl, BytesN};
/// #
/// # #[contract]
/// # pub struct Contract;
/// #
/// # #[contractimpl]
/// # impl Contract {
/// #     pub fn f(env: Env) {
/// let ledger = env.ledger();
///
/// let protocol_version = ledger.protocol_version();
/// let sequence = ledger.sequence();
/// let timestamp = ledger.timestamp();
/// let network_id = ledger.network_id();
/// #     }
/// # }
/// #
/// # #[cfg(feature = "testutils")]
/// # fn main() {
/// #     let env = Env::default();
/// #     let contract_id = env.register(Contract, ());
/// #     ContractClient::new(&env, &contract_id).f();
/// # }
/// # #[cfg(not(feature = "testutils"))]
/// # fn main() { }
/// ```
#[derive(Clone)]
pub struct Ledger(Env);

impl Ledger {
    #[inline(always)]
    pub(crate) fn env(&self) -> &Env {
        &self.0
    }

    #[inline(always)]
    pub(crate) fn new(env: &Env) -> Ledger {
        Ledger(env.clone())
    }

    /// Returns the version of the protocol that the ledger created with.
    pub fn protocol_version(&self) -> u32 {
        internal::Env::get_ledger_version(self.env())
            .unwrap_infallible()
            .into()
    }

    /// Returns the sequence number of the ledger.
    ///
    /// The sequence number is a unique number for each ledger
    /// that is sequential, incremented by one for each new ledger.
    pub fn sequence(&self) -> u32 {
        internal::Env::get_ledger_sequence(self.env())
            .unwrap_infallible()
            .into()
    }

    /// Returns the maximum ledger sequence number that data can live to.
    #[doc(hidden)]
    pub fn max_live_until_ledger(&self) -> u32 {
        internal::Env::get_max_live_until_ledger(self.env())
            .unwrap_infallible()
            .into()
    }

    /// Returns a unix timestamp for when the ledger was closed.
    ///
    /// The timestamp is the number of seconds, excluding leap seconds, that
    /// have elapsed since unix epoch. Unix epoch is January 1st, 1970, at
    /// 00:00:00 UTC.
    ///
    /// For more details see:
    ///  - <https://developers.stellar.org/docs/learn/encyclopedia/network-configuration/ledger-headers#close-time>
    pub fn timestamp(&self) -> u64 {
        internal::Env::get_ledger_timestamp(self.env())
            .unwrap_infallible()
            .try_into_val(self.env())
            .unwrap()
    }

    /// Returns the network identifier.
    ///
    /// This is SHA-256 hash of the network passphrase, for example
    /// for the Public Network this returns:
    /// > SHA256(Public Global Stellar Network ; September 2015)
    ///
    /// Returns for the Test Network:
    /// > SHA256(Test SDF Network ; September 2015)
    pub fn network_id(&self) -> BytesN<32> {
        let env = self.env();
        let bin_obj = internal::Env::get_ledger_network_id(env).unwrap_infallible();
        unsafe { BytesN::<32>::unchecked_new(env.clone(), bin_obj) }
    }
}

#[cfg(any(test, feature = "testutils"))]
use crate::testutils;

#[cfg(any(test, feature = "testutils"))]
#[cfg_attr(feature = "docs", doc(cfg(feature = "testutils")))]
impl testutils::Ledger for Ledger {
    fn set(&self, li: testutils::LedgerInfo) {
        let env = self.env();
        env.host().set_ledger_info(li).unwrap();
    }

    fn set_protocol_version(&self, protocol_version: u32) {
        self.with_mut(|ledger_info| {
            ledger_info.protocol_version = protocol_version;
        });
    }

    fn set_sequence_number(&self, sequence_number: u32) {
        self.with_mut(|ledger_info| {
            ledger_info.sequence_number = sequence_number;
        });
    }

    fn set_timestamp(&self, timestamp: u64) {
        self.with_mut(|ledger_info| {
            ledger_info.timestamp = timestamp;
        });
    }

    fn set_network_id(&self, network_id: [u8; 32]) {
        self.with_mut(|ledger_info| {
            ledger_info.network_id = network_id;
        });
    }

    fn set_base_reserve(&self, base_reserve: u32) {
        self.with_mut(|ledger_info| {
            ledger_info.base_reserve = base_reserve;
        });
    }

    fn set_min_temp_entry_ttl(&self, min_temp_entry_ttl: u32) {
        self.with_mut(|ledger_info| {
            ledger_info.min_temp_entry_ttl = min_temp_entry_ttl;
        });
    }

    fn set_min_persistent_entry_ttl(&self, min_persistent_entry_ttl: u32) {
        self.with_mut(|ledger_info| {
            ledger_info.min_persistent_entry_ttl = min_persistent_entry_ttl;
        });
    }

    fn set_max_entry_ttl(&self, max_entry_ttl: u32) {
        self.with_mut(|ledger_info| {
            // For the sake of consistency across SDK methods,
            // we always make  TTL values to not include the current ledger.
            // The actual network setting in env expects this to include
            // the current ledger, so we need to add 1 here.
            ledger_info.max_entry_ttl = max_entry_ttl.saturating_add(1);
        });
    }

    fn get(&self) -> testutils::LedgerInfo {
        let env = self.env();
        env.host().with_ledger_info(|li| Ok(li.clone())).unwrap()
    }

    fn with_mut<F>(&self, f: F)
    where
        F: FnMut(&mut internal::LedgerInfo),
    {
        let env = self.env();
        env.host().with_mut_ledger_info(f).unwrap();
    }
}

//! Logging contains types for logging debug events.
//!
//! See [`log`][crate::log] for how to conveniently log debug events.
use core::fmt::Debug;

use crate::{env::internal::EnvBase, Env, Val};

/// Log a debug event.
///
/// Takes a [Env], a literal string, and an optional trailing sequence of
/// arguments that may be any value that are convertible to [`Val`]. The
/// string and arguments are appended as-is to the log, as the body of a
/// structured diagnostic event. Such events may be emitted from the host as
/// auxiliary diagnostic XDR, or converted to strings later for debugging.
///
/// `log!` statements are only enabled in non optimized builds that have
/// `debug-assertions` enabled. To enable `debug-assertions` add the following
/// lines to `Cargo.toml`, then build with the profile specified, `--profile
/// release-with-logs`. See the cargo docs for how to use [custom profiles].
///
/// ```toml
/// [profile.release-with-logs]
/// inherits = "release"
/// debug-assertions = true
/// ```
///
/// [custom profiles]:
///     https://doc.rust-lang.org/cargo/reference/profiles.html#custom-profiles
///
/// ### Examples
///
/// Log a string:
///
/// ```
/// use soroban_sdk::{log, Env};
///
/// let env = Env::default();
///
/// log!(&env, "a log entry");
/// ```
///
/// Log a string with values:
///
/// ```
/// use soroban_sdk::{log, symbol_short, Symbol, Env};
///
/// let env = Env::default();
///
/// let value = 5;
/// log!(&env, "a log entry", value, symbol_short!("another"));
/// ```
///
/// Assert on logs in tests:
///
/// ```
/// # #[cfg(feature = "testutils")]
/// # {
/// use soroban_sdk::{log, symbol_short, Symbol, Env};
///
/// let env = Env::default();
///
/// let value = 5;
/// log!(&env, "a log entry", value, symbol_short!("another"));
///
/// use soroban_sdk::testutils::Logs;
/// let logentry = env.logs().all().last().unwrap().clone();
/// assert!(logentry.contains("[\"a log entry\", 5, another]"));
/// # }
/// ```
#[macro_export]
macro_rules! log {
    ($env:expr, $fmt:literal $(,)?) => {
        if cfg!(debug_assertions) {
            $env.logs().add($fmt, &[]);
        }
    };
    ($env:expr, $fmt:literal, $($args:expr),* $(,)?) => {
        if cfg!(debug_assertions) {
            $env.logs().add($fmt, &[
                $(
                    <_ as $crate::IntoVal<Env, $crate::Val>>::into_val(&$args, $env)
                ),*
            ]);
        }
    };
}

/// Logs logs debug events.
///
/// See [`log`][crate::log] for how to conveniently log debug events.
#[derive(Clone)]
pub struct Logs(Env);

impl Debug for Logs {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "Logs")
    }
}

impl Logs {
    #[inline(always)]
    pub(crate) fn env(&self) -> &Env {
        &self.0
    }

    #[inline(always)]
    pub(crate) fn new(env: &Env) -> Logs {
        Logs(env.clone())
    }

    #[deprecated(note = "use [Logs::add]")]
    #[inline(always)]
    pub fn log(&self, msg: &'static str, args: &[Val]) {
        self.add(msg, args);
    }

    /// Log a debug event.
    ///
    /// Takes a literal string and a sequence of trailing values to add
    /// as a log entry in the diagnostic event stream.
    ///
    /// See [`log`][crate::log] for how to conveniently log debug events.
    #[inline(always)]
    pub fn add(&self, msg: &'static str, args: &[Val]) {
        if cfg!(debug_assertions) {
            let env = self.env();
            env.log_from_slice(msg, args).unwrap();

            #[cfg(any(test, feature = "testutils"))]
            {
                use crate::testutils::Logs;
                std::println!("{}", self.all().last().unwrap());
            }
        }
    }
}

#[cfg(any(test, feature = "testutils"))]
use crate::testutils;

#[cfg(any(test, feature = "testutils"))]
#[cfg_attr(feature = "docs", doc(cfg(feature = "testutils")))]
impl testutils::Logs for Logs {
    fn all(&self) -> std::vec::Vec<String> {
        use crate::xdr::{
            ContractEventBody, ContractEventType, ScSymbol, ScVal, ScVec, StringM, VecM,
        };
        let env = self.env();
        let log_sym = ScSymbol(StringM::try_from("log").unwrap());
        let log_topics = ScVec(VecM::try_from(vec![ScVal::Symbol(log_sym)]).unwrap());
        env.host()
            .get_diagnostic_events()
            .unwrap()
            .0
            .into_iter()
            .filter_map(|e| match (&e.event.type_, &e.event.body) {
                (ContractEventType::Diagnostic, ContractEventBody::V0(ce))
                    if &ce.topics == &log_topics.0 =>
                {
                    Some(format!("{}", &e))
                }
                _ => None,
            })
            .collect::<std::vec::Vec<_>>()
    }

    fn print(&self) {
        std::println!("{}", self.all().join("\n"))
    }
}

//! Prng contains a pseudo-random number generator.
//!
//! ## Warning
//!
//! Do not use the PRNG in this module without a clear understanding of two
//! major limitations in the way it is deployed in the Stellar network:
//!
//!   1. The PRNG is seeded with data that is public as soon as each ledger is
//!      nominated. Therefore it **should never be used to generate secrets**.
//!
//!   2. The PRNG is seeded with data that is under the control of validators.
//!      Therefore it **should only be used in applications where the risk of
//!      validator influence is acceptable**.
//!
//! The PRNG in this module is a strong CSPRNG (ChaCha20) and can be manually
//! re-seeded by contracts, in order to support commit/reveal schemes, oracles,
//! or similar advanced types of pseudo-random contract behaviour. Any PRNG is
//! however only as strong as its seed.
//!
//! The network runs in strict consensus, so every node in the network seeds its
//! PRNG with a consensus value, **not a random entropy source**. It uses data
//! that is generally difficult to predict in advance, and generally difficult
//! for network **users** to bias to a specific value: the seed is derived from
//! the overall transaction-set hash and the hash-sorted position number of each
//! transaction within it. But this seed is **not secret** and **not
//! cryptographically hard to bias** if a corrupt **validator** were to choose
//! to do so (similar to the way a corrupt validator can bias overall
//! transaction admission in the network).
//!
//! In other words the network will provide a stronger seed than a contract
//! could likely derive on-chain using any other public data visible to it (eg.
//! better than using a timestamp, ledger number, counter, or a similarly weak
//! seed) but weaker than a contract could acquire using a commit/reveal scheme
//! with an off-chain source of trusted random entropy.
//!
//! You should carefully consider whether these limitations are acceptable for
//! your application before using this module.
//!
//! ## Operation
//!
//! The host has a single hidden "base" PRNG that is seeded by the network. The
//! base PRNG is then used to seed separate, independent "local" PRNGs for each
//! contract invocation. This independence has the following characteristics:
//!
//!   - Contract invocations can only access (use or reseed) their local PRNG.
//!   - Contract invocations cannot influence any other invocation's local PRNG,
//!     except by influencing the other invocation to make a call to its PRNG.
//!   - Contracts cannot influence the base PRNG that seeds local PRNGs, except
//!     by making calls and thereby creating new local PRNGs with new seeds.
//!   - A contract invocation's local PRNG maintains state through the life of
//!     the invocation.
//!   - That state is advanced by each call from the invocation to a PRNG
//!     function in this module.
//!   - A contract invocation's local PRNG is destroyed after the invocation.
//!   - Any re-entry of a contract counts as a separate invocation.
//!
//! ## Testing
//!
//! In local tests, the base PRNG of each host is seeded to zero when the host
//! is constructed, so each contract invocation's local PRNG seed (and all its
//! PRNG-derived calls) will be determined strictly by its order of invocation
//! in the test. Assuming this order is stable, each test run should see stable
//! output from the local PRNG.
use core::ops::{Bound, RangeBounds};

use crate::{
    env::internal,
    unwrap::{UnwrapInfallible, UnwrapOptimized},
    Bytes, BytesN, Env, IntoVal, Vec,
};

/// Prng is a pseudo-random generator.
///
/// # Warning
///
/// **The PRNG is unsuitable for generating secrets or use in applications with
/// low risk tolerance, see the module-level comment.**
pub struct Prng {
    env: Env,
}

impl Prng {
    pub(crate) fn new(env: &Env) -> Prng {
        Prng { env: env.clone() }
    }

    pub fn env(&self) -> &Env {
        &self.env
    }

    /// Reseeds the PRNG with the provided value.
    ///
    /// # Warning
    ///
    /// **The PRNG is unsuitable for generating secrets or use in applications with
    /// low risk tolerance, see the module-level comment.**
    pub fn seed(&self, seed: Bytes) {
        let env = self.env();
        assert_in_contract!(env);
        internal::Env::prng_reseed(env, seed.into()).unwrap_infallible();
    }

    /// Fills the type with a random value.
    ///
    /// # Warning
    ///
    /// **The PRNG is unsuitable for generating secrets or use in applications with
    /// low risk tolerance, see the module-level comment.**
    ///
    /// # Examples
    ///
    /// ## `u64`
    ///
    /// ```
    /// # use soroban_sdk::{Env, contract, contractimpl, symbol_short, Bytes};
    /// #
    /// # #[contract]
    /// # pub struct Contract;
    /// #
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// #     let contract_id = env.register(Contract, ());
    /// #     env.as_contract(&contract_id, || {
    /// #         env.prng().seed(Bytes::from_array(&env, &[1; 32]));
    /// let mut value: u64 = 0;
    /// env.prng().fill(&mut value);
    /// assert_eq!(value, 8478755077819529274);
    /// #     })
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    ///
    /// ## `[u8]`
    ///
    /// ```
    /// # use soroban_sdk::{Env, contract, contractimpl, symbol_short, Bytes};
    /// #
    /// # #[contract]
    /// # pub struct Contract;
    /// #
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// #     let contract_id = env.register(Contract, ());
    /// #     env.as_contract(&contract_id, || {
    /// #         env.prng().seed(Bytes::from_array(&env, &[1; 32]));
    /// let mut value = [0u8; 32];
    /// env.prng().fill(&mut value);
    /// assert_eq!(
    ///   value,
    ///   [
    ///     58, 248, 248, 38, 210, 150, 170, 117, 122, 110, 9, 101, 244, 57,
    ///     221, 102, 164, 48, 43, 104, 222, 229, 242, 29, 25, 148, 88, 204,
    ///     130, 148, 2, 66
    ///   ],
    /// );
    /// #     })
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    pub fn fill<T>(&self, v: &mut T)
    where
        T: Fill + ?Sized,
    {
        v.fill(self);
    }

    /// Returns a random value of the given type.
    ///
    /// # Warning
    ///
    /// **The PRNG is unsuitable for generating secrets or use in applications with
    /// low risk tolerance, see the module-level comment.**
    ///
    /// # Examples
    ///
    /// ## `u64`
    ///
    /// ```
    /// # use soroban_sdk::{Env, contract, contractimpl, symbol_short, Bytes};
    /// #
    /// # #[contract]
    /// # pub struct Contract;
    /// #
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// #     let contract_id = env.register(Contract, ());
    /// #     env.as_contract(&contract_id, || {
    /// #         env.prng().seed(Bytes::from_array(&env, &[1; 32]));
    /// let value: u64 = env.prng().gen();
    /// assert_eq!(value, 8478755077819529274);
    /// #     })
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    ///
    /// ## `[u8; N]`
    ///
    /// ```
    /// # use soroban_sdk::{Env, contract, contractimpl, symbol_short, Bytes};
    /// #
    /// # #[contract]
    /// # pub struct Contract;
    /// #
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// #     let contract_id = env.register(Contract, ());
    /// #     env.as_contract(&contract_id, || {
    /// #         env.prng().seed(Bytes::from_array(&env, &[1; 32]));
    /// let value: [u8; 32] = env.prng().gen();
    /// assert_eq!(
    ///   value,
    ///   [
    ///     58, 248, 248, 38, 210, 150, 170, 117, 122, 110, 9, 101, 244, 57,
    ///     221, 102, 164, 48, 43, 104, 222, 229, 242, 29, 25, 148, 88, 204,
    ///     130, 148, 2, 66
    ///   ],
    /// );
    /// #     })
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    pub fn gen<T>(&self) -> T
    where
        T: Gen,
    {
        T::gen(self)
    }

    /// Returns a random value of the given type with the given length.
    ///
    /// # Panics
    ///
    /// If the length is greater than u32::MAX.
    ///
    /// # Warning
    ///
    /// **The PRNG is unsuitable for generating secrets or use in applications with
    /// low risk tolerance, see the module-level comment.**
    ///
    /// # Examples
    ///
    /// ## `Bytes`
    ///
    /// ```
    /// # use soroban_sdk::{Env, contract, contractimpl, symbol_short, Bytes};
    /// #
    /// # #[contract]
    /// # pub struct Contract;
    /// #
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// #     let contract_id = env.register(Contract, ());
    /// #     env.as_contract(&contract_id, || {
    /// #         env.prng().seed(Bytes::from_array(&env, &[1; 32]));
    /// // Get a value of length 32 bytes.
    /// let value: Bytes = env.prng().gen_len(32);
    /// assert_eq!(value, Bytes::from_slice(
    ///   &env,
    ///   &[
    ///     58, 248, 248, 38, 210, 150, 170, 117, 122, 110, 9, 101, 244, 57,
    ///     221, 102, 164, 48, 43, 104, 222, 229, 242, 29, 25, 148, 88, 204,
    ///     130, 148, 2, 66
    ///   ],
    /// ));
    /// #     })
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    pub fn gen_len<T>(&self, len: T::Len) -> T
    where
        T: GenLen,
    {
        T::gen_len(self, len)
    }

    /// Returns a random value of the given type in the range specified.
    ///
    /// # Panics
    ///
    /// If the start of the range is greater than the end.
    ///
    /// # Warning
    ///
    /// **The PRNG is unsuitable for generating secrets or use in applications with
    /// low risk tolerance, see the module-level comment.**
    ///
    /// # Examples
    ///
    /// ## `u64`
    ///
    /// ```
    /// # use soroban_sdk::{Env, contract, contractimpl, symbol_short, Bytes};
    /// #
    /// # #[contract]
    /// # pub struct Contract;
    /// #
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// #     let contract_id = env.register(Contract, ());
    /// #     env.as_contract(&contract_id, || {
    /// #         env.prng().seed(Bytes::from_array(&env, &[1; 32]));
    /// // Get a value in the range of 1 to 100, inclusive.
    /// let value: u64 = env.prng().gen_range(1..=100);
    /// assert_eq!(value, 46);
    /// #     })
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    pub fn gen_range<T>(&self, r: impl RangeBounds<T::RangeBound>) -> T
    where
        T: GenRange,
    {
        T::gen_range(self, r)
    }

    /// Returns a random u64 in the range specified.
    ///
    /// # Panics
    ///
    /// If the range is empty.
    ///
    /// # Warning
    ///
    /// **The PRNG is unsuitable for generating secrets or use in applications with
    /// low risk tolerance, see the module-level comment.**
    ///
    /// # Examples
    ///
    /// ```
    /// # use soroban_sdk::{Env, contract, contractimpl, symbol_short, Bytes};
    /// #
    /// # #[contract]
    /// # pub struct Contract;
    /// #
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// #     let contract_id = env.register(Contract, ());
    /// #     env.as_contract(&contract_id, || {
    /// #         env.prng().seed(Bytes::from_array(&env, &[1; 32]));
    /// // Get a value in the range of 1 to 100, inclusive.
    /// let value = env.prng().u64_in_range(1..=100);
    /// assert_eq!(value, 46);
    /// #     })
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    #[deprecated(note = "use env.prng().gen_range(...)")]
    pub fn u64_in_range(&self, r: impl RangeBounds<u64>) -> u64 {
        self.gen_range(r)
    }

    /// Shuffles a value using the Fisher-Yates algorithm.
    ///
    /// # Warning
    ///
    /// **The PRNG is unsuitable for generating secrets or use in applications with
    /// low risk tolerance, see the module-level comment.**
    pub fn shuffle<T>(&self, v: &mut T)
    where
        T: Shuffle,
    {
        v.shuffle(self);
    }
}

impl<T> Shuffle for Vec<T> {
    fn shuffle(&mut self, prng: &Prng) {
        let env = prng.env();
        assert_in_contract!(env);
        let obj = internal::Env::prng_vec_shuffle(env, self.to_object()).unwrap_infallible();
        *self = unsafe { Self::unchecked_new(env.clone(), obj) };
    }
}

/// Implemented by types that support being filled by a Prng.
pub trait Fill {
    /// Fills the given value with the Prng.
    fn fill(&mut self, prng: &Prng);
}

/// Implemented by types that support being generated by a Prng.
pub trait Gen {
    /// Generates a value of the implementing type with the Prng.
    fn gen(prng: &Prng) -> Self;
}

/// Implemented by types that support being generated of specific length by a
/// Prng.
pub trait GenLen {
    type Len;

    /// Generates a value of the given implementing type with length with the
    /// Prng.
    ///
    /// # Panics
    ///
    /// If the length is greater than u32::MAX.
    fn gen_len(prng: &Prng, len: Self::Len) -> Self;
}

/// Implemented by types that support being generated in a specific range by a
/// Prng.
pub trait GenRange {
    type RangeBound;

    /// Generates a value of the implementing type with the Prng in the
    /// specified range.
    ///
    /// # Panics
    ///
    /// If the range is empty.
    fn gen_range(prng: &Prng, r: impl RangeBounds<Self::RangeBound>) -> Self;
}

/// Implemented by types that support being shuffled by a Prng.
pub trait Shuffle {
    /// Shuffles the value with the Prng.
    fn shuffle(&mut self, prng: &Prng);
}

/// Implemented by types that support being shuffled by a Prng.
pub trait ToShuffled {
    type Shuffled;
    fn to_shuffled(&self, prng: &Prng) -> Self::Shuffled;
}

impl<T: Shuffle + Clone> ToShuffled for T {
    type Shuffled = Self;
    fn to_shuffled(&self, prng: &Prng) -> Self {
        let mut copy = self.clone();
        copy.shuffle(prng);
        copy
    }
}

impl Fill for u64 {
    fn fill(&mut self, prng: &Prng) {
        *self = Self::gen(prng);
    }
}

impl Gen for u64 {
    fn gen(prng: &Prng) -> Self {
        let env = prng.env();
        assert_in_contract!(env);
        internal::Env::prng_u64_in_inclusive_range(env, u64::MIN, u64::MAX).unwrap_infallible()
    }
}

impl GenRange for u64 {
    type RangeBound = u64;

    fn gen_range(prng: &Prng, r: impl RangeBounds<Self::RangeBound>) -> Self {
        let env = prng.env();
        assert_in_contract!(env);
        let start_bound = match r.start_bound() {
            Bound::Included(b) => *b,
            Bound::Excluded(b) => *b + 1,
            Bound::Unbounded => u64::MIN,
        };
        let end_bound = match r.end_bound() {
            Bound::Included(b) => *b,
            Bound::Excluded(b) => *b - 1,
            Bound::Unbounded => u64::MAX,
        };
        internal::Env::prng_u64_in_inclusive_range(env, start_bound, end_bound).unwrap_infallible()
    }
}

impl Fill for Bytes {
    /// Fills the Bytes with the Prng.
    ///
    /// # Panics
    ///
    /// If the length of Bytes is greater than u32::MAX in length.
    fn fill(&mut self, prng: &Prng) {
        let env = prng.env();
        assert_in_contract!(env);
        let len: u32 = self.len();
        let obj = internal::Env::prng_bytes_new(env, len.into()).unwrap_infallible();
        *self = unsafe { Bytes::unchecked_new(env.clone(), obj) };
    }
}

impl GenLen for Bytes {
    type Len = u32;
    /// Generates the Bytes with the Prng of the given length.
    fn gen_len(prng: &Prng, len: u32) -> Self {
        let env = prng.env();
        assert_in_contract!(env);
        let obj = internal::Env::prng_bytes_new(env, len.into()).unwrap_infallible();
        unsafe { Bytes::unchecked_new(env.clone(), obj) }
    }
}

impl<const N: usize> Fill for BytesN<N> {
    /// Fills the BytesN with the Prng.
    ///
    /// # Panics
    ///
    /// If the length of BytesN is greater than u32::MAX in length.
    fn fill(&mut self, prng: &Prng) {
        let bytesn = Self::gen(prng);
        *self = bytesn;
    }
}

impl<const N: usize> Gen for BytesN<N> {
    /// Generates the BytesN with the Prng.
    ///
    /// # Panics
    ///
    /// If the length of BytesN is greater than u32::MAX in length.
    fn gen(prng: &Prng) -> Self {
        let env = prng.env();
        assert_in_contract!(env);
        let len: u32 = N.try_into().unwrap_optimized();
        let obj = internal::Env::prng_bytes_new(env, len.into()).unwrap_infallible();
        unsafe { BytesN::unchecked_new(env.clone(), obj) }
    }
}

impl Fill for [u8] {
    /// Fills the slice with the Prng.
    ///
    /// # Panics
    ///
    /// If the slice is greater than u32::MAX in length.
    fn fill(&mut self, prng: &Prng) {
        let env = prng.env();
        assert_in_contract!(env);
        let len: u32 = self.len().try_into().unwrap_optimized();
        let bytes: Bytes = internal::Env::prng_bytes_new(env, len.into())
            .unwrap_infallible()
            .into_val(env);
        bytes.copy_into_slice(self);
    }
}

impl<const N: usize> Fill for [u8; N] {
    /// Fills the array with the Prng.
    ///
    /// # Panics
    ///
    /// If the array is greater than u32::MAX in length.
    fn fill(&mut self, prng: &Prng) {
        let env = prng.env();
        assert_in_contract!(env);
        let len: u32 = N.try_into().unwrap_optimized();
        let bytes: Bytes = internal::Env::prng_bytes_new(env, len.into())
            .unwrap_infallible()
            .into_val(env);
        bytes.copy_into_slice(self);
    }
}

impl<const N: usize> Gen for [u8; N] {
    /// Generates the array with the Prng.
    ///
    /// # Panics
    ///
    /// If the array is greater than u32::MAX in length.
    fn gen(prng: &Prng) -> Self {
        let mut v = [0u8; N];
        v.fill(prng);
        v
    }
}

//! Token contains types for calling and accessing token contracts, including
//! the Stellar Asset Contract.
//!
//! See [`TokenInterface`] for the interface of token contracts such as the
//! Stellar Asset Contract.
//!
//! Use [`TokenClient`] for calling token contracts such as the Stellar Asset
//! Contract.

use crate::{contractclient, contractspecfn, Address, Env, String};

// The interface below was copied from
// https://github.com/stellar/rs-soroban-env/blob/main/soroban-env-host/src/native_contract/token/contract.rs
// at commit b3c188f48dec51a956c1380fb6fe92201a3f716b.
//
// Differences between this interface and the built-in contract
// 1. The return values here don't return Results.
// 2. The implementations have been replaced with a panic.
// 3. &Host type usage are replaced with Env

#[doc(hidden)]
#[deprecated(note = "use TokenInterface")]
pub use TokenInterface as Interface;

#[doc(hidden)]
#[deprecated(note = "use TokenClient")]
pub use TokenClient as Client;

/// Interface for Token contracts, such as the Stellar Asset Contract.
///
/// Defined by [SEP-41].
///
/// [SEP-41]: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md
///
/// The token interface provides the following functionality.
///
/// If a contract implementing the interface does not support some of the
/// functionality, it should return an error.
///
/// The interface does not define any set of standard errors. Errors can be
/// defined by the implementing contract.
///
/// ## Meta
///
/// Tokens implementing the interface expose meta functions about the token:
/// - [`decimals`][Self::decimals]
/// - [`name`][Self::name]
/// - [`symbol`][Self::symbol]
///
/// ## Balances
///
/// Tokens track a balance for each address that holds the token. Tokens implementing the interface expose
/// a single function for getting the balance that an address holds:
/// - [`balance`][Self::balance]
///
/// ## Transfers
///
/// Tokens allow holders of the token to transfer tokens to other addresses.
/// Tokens implementing the interface expose a single function for doing so:
/// - [`transfer`][Self::transfer]
///
/// ## Burning
///
/// Tokens allow holders of the token to burn, i.e. dispose of, tokens without
/// transferring them to another holder. Tokens implementing the interface
/// expose a single function for doing so:
/// - [`burn`][Self::burn]
///
/// ## Allowances
///
/// Tokens can allow holders to permit others to transfer amounts from their
/// balance using the following functions.
/// - [`allowance`][Self::allowance]
/// - [`approve`][Self::approve]
/// - [`transfer_from`][Self::transfer_from]
/// - [`burn_from`][Self::burn_from]
///
/// ## Minting
///
/// There are no functions in the token interface for minting tokens. Minting is
/// an administrative function that can differ significantly from one token to
/// the next.
#[contractspecfn(name = "StellarAssetSpec", export = false)]
#[contractclient(crate_path = "crate", name = "TokenClient")]
pub trait TokenInterface {
    /// Returns the allowance for `spender` to transfer from `from`.
    ///
    /// The amount returned is the amount that spender is allowed to transfer
    /// out of from's balance. When the spender transfers amounts, the allowance
    /// will be reduced by the amount transferred.
    ///
    /// # Arguments
    ///
    /// * `from` - The address holding the balance of tokens to be drawn from.
    /// * `spender` - The address spending the tokens held by `from`.
    fn allowance(env: Env, from: Address, spender: Address) -> i128;

    /// Set the allowance by `amount` for `spender` to transfer/burn from
    /// `from`.
    ///
    /// The amount set is the amount that spender is approved to transfer out of
    /// from's balance. The spender will be allowed to transfer amounts, and
    /// when an amount is transferred the allowance will be reduced by the
    /// amount transferred.
    ///
    /// # Arguments
    ///
    /// * `from` - The address holding the balance of tokens to be drawn from.
    /// * `spender` - The address being authorized to spend the tokens held by
    ///   `from`.
    /// * `amount` - The tokens to be made available to `spender`.
    /// * `expiration_ledger` - The ledger number where this allowance expires. Cannot
    ///    be less than the current ledger number unless the amount is being set to 0.
    ///    An expired entry (where expiration_ledger < the current ledger number)
    ///    should be treated as a 0 amount allowance.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["approve", from: Address,
    /// spender: Address], data = [amount: i128, expiration_ledger: u32]`
    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32);

    /// Returns the balance of `id`.
    ///
    /// # Arguments
    ///
    /// * `id` - The address for which a balance is being queried. If the
    ///   address has no existing balance, returns 0.
    fn balance(env: Env, id: Address) -> i128;

    /// Transfer `amount` from `from` to `to`.
    ///
    /// # Arguments
    ///
    /// * `from` - The address holding the balance of tokens which will be
    ///   withdrawn from.
    /// * `to` - The address which will receive the transferred tokens.
    /// * `amount` - The amount of tokens to be transferred.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["transfer", from: Address, to: Address],
    /// data = amount: i128`
    fn transfer(env: Env, from: Address, to: Address, amount: i128);

    /// Transfer `amount` from `from` to `to`, consuming the allowance that
    /// `spender` has on `from`'s balance. Authorized by spender
    /// (`spender.require_auth()`).
    ///
    /// The spender will be allowed to transfer the amount from from's balance
    /// if the amount is less than or equal to the allowance that the spender
    /// has on the from's balance. The spender's allowance on from's balance
    /// will be reduced by the amount.
    ///
    /// # Arguments
    ///
    /// * `spender` - The address authorizing the transfer, and having its
    ///   allowance consumed during the transfer.
    /// * `from` - The address holding the balance of tokens which will be
    ///   withdrawn from.
    /// * `to` - The address which will receive the transferred tokens.
    /// * `amount` - The amount of tokens to be transferred.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["transfer", from: Address, to: Address],
    /// data = amount: i128`
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);

    /// Burn `amount` from `from`.
    ///
    /// Reduces from's balance by the amount, without transferring the balance
    /// to another holder's balance.
    ///
    /// # Arguments
    ///
    /// * `from` - The address holding the balance of tokens which will be
    ///   burned from.
    /// * `amount` - The amount of tokens to be burned.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["burn", from: Address], data = amount:
    /// i128`
    fn burn(env: Env, from: Address, amount: i128);

    /// Burn `amount` from `from`, consuming the allowance of `spender`.
    ///
    /// Reduces from's balance by the amount, without transferring the balance
    /// to another holder's balance.
    ///
    /// The spender will be allowed to burn the amount from from's balance, if
    /// the amount is less than or equal to the allowance that the spender has
    /// on the from's balance. The spender's allowance on from's balance will be
    /// reduced by the amount.
    ///
    /// # Arguments
    ///
    /// * `spender` - The address authorizing the burn, and having its allowance
    ///   consumed during the burn.
    /// * `from` - The address holding the balance of tokens which will be
    ///   burned from.
    /// * `amount` - The amount of tokens to be burned.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["burn", from: Address], data = amount:
    /// i128`
    fn burn_from(env: Env, spender: Address, from: Address, amount: i128);

    /// Returns the number of decimals used to represent amounts of this token.
    ///
    /// # Panics
    ///
    /// If the contract has not yet been initialized.
    fn decimals(env: Env) -> u32;

    /// Returns the name for this token.
    ///
    /// # Panics
    ///
    /// If the contract has not yet been initialized.
    fn name(env: Env) -> String;

    /// Returns the symbol for this token.
    ///
    /// # Panics
    ///
    /// If the contract has not yet been initialized.
    fn symbol(env: Env) -> String;
}

/// Interface for admin capabilities for Token contracts, such as the Stellar
/// Asset Contract.
#[contractspecfn(name = "StellarAssetSpec", export = false)]
#[contractclient(crate_path = "crate", name = "StellarAssetClient")]
pub trait StellarAssetInterface {
    /// Sets the administrator to the specified address `new_admin`.
    ///
    /// # Arguments
    ///
    /// * `new_admin` - The address which will henceforth be the administrator
    ///   of this token contract.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["set_admin", admin: Address], data =
    /// [new_admin: Address]`
    fn set_admin(env: Env, new_admin: Address);

    /// Returns the admin of the contract.
    ///
    /// # Panics
    ///
    /// If the admin is not set.
    fn admin(env: Env) -> Address;

    /// Sets whether the account is authorized to use its balance. If
    /// `authorized` is true, `id` should be able to use its balance.
    ///
    /// # Arguments
    ///
    /// * `id` - The address being (de-)authorized.
    /// * `authorize` - Whether or not `id` can use its balance.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["set_authorized", id: Address], data =
    /// [authorize: bool]`
    fn set_authorized(env: Env, id: Address, authorize: bool);

    /// Returns true if `id` is authorized to use its balance.
    ///
    /// # Arguments
    ///
    /// * `id` - The address for which token authorization is being checked.
    fn authorized(env: Env, id: Address) -> bool;

    /// Mints `amount` to `to`.
    ///
    /// # Arguments
    ///
    /// * `to` - The address which will receive the minted tokens.
    /// * `amount` - The amount of tokens to be minted.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["mint", admin: Address, to: Address], data
    /// = amount: i128`
    fn mint(env: Env, to: Address, amount: i128);

    /// Clawback `amount` from `from` account. `amount` is burned in the
    /// clawback process.
    ///
    /// # Arguments
    ///
    /// * `from` - The address holding the balance from which the clawback will
    ///   take tokens.
    /// * `amount` - The amount of tokens to be clawed back.
    ///
    /// # Events
    ///
    /// Emits an event with topics `["clawback", admin: Address, to: Address],
    /// data = amount: i128`
    fn clawback(env: Env, from: Address, amount: i128);
}

/// Spec contains the contract spec of Token contracts, including the general
/// interface, as well as the admin interface, such as the Stellar Asset
/// Contract.
#[doc(hidden)]
pub struct StellarAssetSpec;

pub(crate) const SPEC_XDR_INPUT: &[&[u8]] = &[
    &StellarAssetSpec::spec_xdr_allowance(),
    &StellarAssetSpec::spec_xdr_authorized(),
    &StellarAssetSpec::spec_xdr_approve(),
    &StellarAssetSpec::spec_xdr_balance(),
    &StellarAssetSpec::spec_xdr_burn(),
    &StellarAssetSpec::spec_xdr_burn_from(),
    &StellarAssetSpec::spec_xdr_clawback(),
    &StellarAssetSpec::spec_xdr_decimals(),
    &StellarAssetSpec::spec_xdr_mint(),
    &StellarAssetSpec::spec_xdr_name(),
    &StellarAssetSpec::spec_xdr_set_admin(),
    &StellarAssetSpec::spec_xdr_admin(),
    &StellarAssetSpec::spec_xdr_set_authorized(),
    &StellarAssetSpec::spec_xdr_symbol(),
    &StellarAssetSpec::spec_xdr_transfer(),
    &StellarAssetSpec::spec_xdr_transfer_from(),
];

pub(crate) const SPEC_XDR_LEN: usize = 6456;

impl StellarAssetSpec {
    /// Returns the XDR spec for the Token contract.
    pub const fn spec_xdr() -> [u8; SPEC_XDR_LEN] {
        let input = SPEC_XDR_INPUT;
        // Concatenate all XDR for each item that makes up the token spec.
        let mut output = [0u8; SPEC_XDR_LEN];
        let mut input_i = 0;
        let mut output_i = 0;
        while input_i < input.len() {
            let subinput = input[input_i];
            let mut subinput_i = 0;
            while subinput_i < subinput.len() {
                output[output_i] = subinput[subinput_i];
                output_i += 1;
                subinput_i += 1;
            }
            input_i += 1;
        }

        // Check that the numbers of bytes written is equal to the number of bytes
        // expected in the output.
        if output_i != output.len() {
            panic!("unexpected output length",);
        }

        output
    }
}

//! Convert values to and from [Bytes].
//!
//! All types that are convertible to and from [Val] implement the
//! [ToXdr] and [FromXdr] traits, and serialize to the ScVal XDR form.
//!
//! ### Examples
//!
//! ```
//! use soroban_sdk::{
//!     xdr::{FromXdr, ToXdr},
//!     Env, Bytes, IntoVal, TryFromVal,
//! };
//!
//! let env = Env::default();
//!
//! let value: u32 = 5;
//!
//! let bytes = value.to_xdr(&env);
//! assert_eq!(bytes.len(), 8);
//!
//! let roundtrip = u32::from_xdr(&env, &bytes);
//! assert_eq!(roundtrip, Ok(value));
//! ```

use crate::{
    env::internal::Env as _, unwrap::UnwrapInfallible, Bytes, Env, IntoVal, TryFromVal, Val,
};

// Re-export all the XDR from the environment.
pub use crate::env::xdr::*;

/// Implemented by types that can be serialized to [Bytes].
///
/// All types that are convertible to [Val] are implemented.
pub trait ToXdr {
    fn to_xdr(self, env: &Env) -> Bytes;
}

/// Implemented by types that can be deserialized from [Bytes].
///
/// All types that are convertible from [Val] are implemented.
pub trait FromXdr: Sized {
    type Error;
    fn from_xdr(env: &Env, b: &Bytes) -> Result<Self, Self::Error>;
}

impl<T> ToXdr for T
where
    T: IntoVal<Env, Val>,
{
    fn to_xdr(self, env: &Env) -> Bytes {
        let val: Val = self.into_val(env);
        let bin = env.serialize_to_bytes(val).unwrap_infallible();
        unsafe { Bytes::unchecked_new(env.clone(), bin) }
    }
}

impl<T> FromXdr for T
where
    T: TryFromVal<Env, Val>,
{
    type Error = T::Error;

    fn from_xdr(env: &Env, b: &Bytes) -> Result<Self, Self::Error> {
        let t = env.deserialize_from_bytes(b.into()).unwrap_infallible();
        T::try_from_val(env, &t)
    }
}

#![cfg(any(test, feature = "testutils"))]
#![cfg_attr(feature = "docs", doc(cfg(feature = "testutils")))]

//! Utilities intended for use when testing.

pub mod arbitrary;

mod sign;
use std::rc::Rc;

pub use sign::ed25519;

mod mock_auth;
pub use mock_auth::{
    AuthorizedFunction, AuthorizedInvocation, MockAuth, MockAuthContract, MockAuthInvoke,
};
use soroban_env_host::TryIntoVal;

pub mod storage;

pub mod cost_estimate;

use crate::{xdr, ConstructorArgs, Env, Val, Vec};
use soroban_ledger_snapshot::LedgerSnapshot;

pub use crate::env::EnvTestConfig;

pub trait Register {
    fn register<'i, I, A>(self, env: &Env, id: I, args: A) -> crate::Address
    where
        I: Into<Option<&'i crate::Address>>,
        A: ConstructorArgs;
}

impl<C> Register for C
where
    C: ContractFunctionSet + 'static,
{
    fn register<'i, I, A>(self, env: &Env, id: I, args: A) -> crate::Address
    where
        I: Into<Option<&'i crate::Address>>,
        A: ConstructorArgs,
    {
        env.register_contract_with_constructor(id, self, args)
    }
}

impl<'w> Register for &'w [u8] {
    fn register<'i, I, A>(self, env: &Env, id: I, args: A) -> crate::Address
    where
        I: Into<Option<&'i crate::Address>>,
        A: ConstructorArgs,
    {
        env.register_contract_wasm_with_constructor(id, self, args)
    }
}

#[derive(Default, Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Snapshot {
    pub generators: Generators,
    pub auth: AuthSnapshot,
    pub ledger: LedgerSnapshot,
    pub events: EventsSnapshot,
}

impl Snapshot {
    // Read in a [`Snapshot`] from a reader.
    pub fn read(r: impl std::io::Read) -> Result<Snapshot, std::io::Error> {
        Ok(serde_json::from_reader::<_, Snapshot>(r)?)
    }

    // Read in a [`Snapshot`] from a file.
    pub fn read_file(p: impl AsRef<std::path::Path>) -> Result<Snapshot, std::io::Error> {
        Self::read(std::fs::File::open(p)?)
    }

    // Write a [`Snapshot`] to a writer.
    pub fn write(&self, w: impl std::io::Write) -> Result<(), std::io::Error> {
        Ok(serde_json::to_writer_pretty(w, self)?)
    }

    // Write a [`Snapshot`] to file.
    pub fn write_file(&self, p: impl AsRef<std::path::Path>) -> Result<(), std::io::Error> {
        let p = p.as_ref();
        if let Some(dir) = p.parent() {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        self.write(std::fs::File::create(p)?)
    }
}

#[derive(Default, Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct EventsSnapshot(pub std::vec::Vec<EventSnapshot>);

impl EventsSnapshot {
    // Read in a [`EventsSnapshot`] from a reader.
    pub fn read(r: impl std::io::Read) -> Result<EventsSnapshot, std::io::Error> {
        Ok(serde_json::from_reader::<_, EventsSnapshot>(r)?)
    }

    // Read in a [`EventsSnapshot`] from a file.
    pub fn read_file(p: impl AsRef<std::path::Path>) -> Result<EventsSnapshot, std::io::Error> {
        Self::read(std::fs::File::open(p)?)
    }

    // Write a [`EventsSnapshot`] to a writer.
    pub fn write(&self, w: impl std::io::Write) -> Result<(), std::io::Error> {
        Ok(serde_json::to_writer_pretty(w, self)?)
    }

    // Write a [`EventsSnapshot`] to file.
    pub fn write_file(&self, p: impl AsRef<std::path::Path>) -> Result<(), std::io::Error> {
        let p = p.as_ref();
        if let Some(dir) = p.parent() {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        self.write(std::fs::File::create(p)?)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct EventSnapshot {
    pub event: xdr::ContractEvent,
    pub failed_call: bool,
}

impl From<crate::env::internal::events::HostEvent> for EventSnapshot {
    fn from(v: crate::env::internal::events::HostEvent) -> Self {
        Self {
            event: v.event,
            failed_call: v.failed_call,
        }
    }
}

#[derive(Default, Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct AuthSnapshot(
    pub std::vec::Vec<std::vec::Vec<(xdr::ScAddress, xdr::SorobanAuthorizedInvocation)>>,
);

impl AuthSnapshot {
    // Read in a [`AuthSnapshot`] from a reader.
    pub fn read(r: impl std::io::Read) -> Result<AuthSnapshot, std::io::Error> {
        Ok(serde_json::from_reader::<_, AuthSnapshot>(r)?)
    }

    // Read in a [`AuthSnapshot`] from a file.
    pub fn read_file(p: impl AsRef<std::path::Path>) -> Result<AuthSnapshot, std::io::Error> {
        Self::read(std::fs::File::open(p)?)
    }

    // Write a [`AuthSnapshot`] to a writer.
    pub fn write(&self, w: impl std::io::Write) -> Result<(), std::io::Error> {
        Ok(serde_json::to_writer_pretty(w, self)?)
    }

    // Write a [`AuthSnapshot`] to file.
    pub fn write_file(&self, p: impl AsRef<std::path::Path>) -> Result<(), std::io::Error> {
        let p = p.as_ref();
        if let Some(dir) = p.parent() {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        self.write(std::fs::File::create(p)?)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct Generators {
    address: u64,
    nonce: u64,
}

impl Default for Generators {
    fn default() -> Generators {
        Generators {
            address: 0,
            nonce: 0,
        }
    }
}

impl Generators {
    // Read in a [`Generators`] from a reader.
    pub fn read(r: impl std::io::Read) -> Result<Generators, std::io::Error> {
        Ok(serde_json::from_reader::<_, Generators>(r)?)
    }

    // Read in a [`Generators`] from a file.
    pub fn read_file(p: impl AsRef<std::path::Path>) -> Result<Generators, std::io::Error> {
        Self::read(std::fs::File::open(p)?)
    }

    // Write a [`Generators`] to a writer.
    pub fn write(&self, w: impl std::io::Write) -> Result<(), std::io::Error> {
        Ok(serde_json::to_writer_pretty(w, self)?)
    }

    // Write a [`Generators`] to file.
    pub fn write_file(&self, p: impl AsRef<std::path::Path>) -> Result<(), std::io::Error> {
        let p = p.as_ref();
        if let Some(dir) = p.parent() {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        self.write(std::fs::File::create(p)?)
    }
}

impl Generators {
    pub fn address(&mut self) -> [u8; 32] {
        self.address = self.address.checked_add(1).unwrap();
        let b: [u8; 8] = self.address.to_be_bytes();
        [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, b[0], b[1],
            b[2], b[3], b[4], b[5], b[6], b[7],
        ]
    }

    pub fn nonce(&mut self) -> i64 {
        self.nonce = self.nonce.checked_add(1).unwrap();
        self.nonce as i64
    }
}

#[doc(hidden)]
pub type ContractFunctionF = dyn Send + Sync + Fn(Env, &[Val]) -> Val;
#[doc(hidden)]
pub trait ContractFunctionRegister {
    fn register(name: &'static str, func: &'static ContractFunctionF);
}
#[doc(hidden)]
pub trait ContractFunctionSet {
    fn call(&self, func: &str, env: Env, args: &[Val]) -> Option<Val>;
}

#[doc(inline)]
pub use crate::env::internal::LedgerInfo;

/// Test utilities for [`Ledger`][crate::ledger::Ledger].
pub trait Ledger {
    /// Set ledger info.
    fn set(&self, l: LedgerInfo);

    /// Sets the protocol version.
    fn set_protocol_version(&self, protocol_version: u32);

    /// Sets the sequence number.
    fn set_sequence_number(&self, sequence_number: u32);

    /// Sets the timestamp.
    fn set_timestamp(&self, timestamp: u64);

    /// Sets the network ID.
    fn set_network_id(&self, network_id: [u8; 32]);

    /// Sets the base reserve.
    fn set_base_reserve(&self, base_reserve: u32);

    /// Sets the minimum temporary entry time-to-live.
    fn set_min_temp_entry_ttl(&self, min_temp_entry_ttl: u32);

    /// Sets the minimum persistent entry time-to-live.
    fn set_min_persistent_entry_ttl(&self, min_persistent_entry_ttl: u32);

    /// Sets the maximum entry time-to-live.
    fn set_max_entry_ttl(&self, max_entry_ttl: u32);

    /// Get ledger info.
    fn get(&self) -> LedgerInfo;

    /// Modify the ledger info.
    fn with_mut<F>(&self, f: F)
    where
        F: FnMut(&mut LedgerInfo);
}

pub mod budget {
    use core::fmt::{Debug, Display};

    #[doc(inline)]
    use crate::env::internal::budget::CostTracker;
    #[doc(inline)]
    pub use crate::xdr::ContractCostType;

    /// Budget that tracks the resources consumed for the environment.
    ///
    /// The budget consistents of two cost dimensions:
    ///  - CPU instructions
    ///  - Memory
    ///
    /// Inputs feed into those cost dimensions.
    ///
    /// Note that all cost dimensions – CPU instructions, memory – and the VM
    /// cost type inputs are likely to be underestimated when running Rust code
    /// compared to running the WASM equivalent.
    ///
    /// ### Examples
    ///
    /// ```
    /// use soroban_sdk::{Env, Symbol};
    ///
    /// # #[cfg(feature = "testutils")]
    /// # fn main() {
    /// #     let env = Env::default();
    /// env.cost_estimate().budget().reset_default();
    /// // ...
    /// println!("{}", env.cost_estimate().budget());
    /// # }
    /// # #[cfg(not(feature = "testutils"))]
    /// # fn main() { }
    /// ```
    pub struct Budget(pub(crate) crate::env::internal::budget::Budget);

    impl Display for Budget {
        fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
            writeln!(f, "{}", self.0)
        }
    }

    impl Debug for Budget {
        fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
            writeln!(f, "{:?}", self.0)
        }
    }

    impl Budget {
        pub(crate) fn new(b: crate::env::internal::budget::Budget) -> Self {
            Self(b)
        }

        /// Reset the budget.
        pub fn reset_default(&mut self) {
            self.0.reset_default().unwrap();
        }

        pub fn reset_unlimited(&mut self) {
            self.0.reset_unlimited().unwrap();
        }

        pub fn reset_limits(&mut self, cpu: u64, mem: u64) {
            self.0.reset_limits(cpu, mem).unwrap();
        }

        pub fn reset_tracker(&mut self) {
            self.0.reset_tracker().unwrap();
        }

        /// Returns the CPU instruction cost.
        ///
        /// Note that CPU instructions are likely to be underestimated when
        /// running Rust code compared to running the WASM equivalent.
        pub fn cpu_instruction_cost(&self) -> u64 {
            self.0.get_cpu_insns_consumed().unwrap()
        }

        /// Returns the memory cost.
        ///
        /// Note that memory is likely to be underestimated when running Rust
        /// code compared to running the WASM equivalent.
        pub fn memory_bytes_cost(&self) -> u64 {
            self.0.get_mem_bytes_consumed().unwrap()
        }

        /// Get the cost tracker associated with the cost type. The tracker
        /// tracks the cumulative iterations and inputs and derived cpu and
        /// memory. If the underlying model is a constant model, then inputs is
        /// `None` and only iterations matter.
        ///
        /// Note that VM cost types are likely to be underestimated when running
        /// natively as Rust code inside tests code compared to running the WASM
        /// equivalent.
        pub fn tracker(&self, cost_type: ContractCostType) -> CostTracker {
            self.0.get_tracker(cost_type).unwrap()
        }

        /// Print the budget costs and inputs to stdout.
        pub fn print(&self) {
            println!("{}", self.0);
        }
    }
}

/// Test utilities for [`Events`][crate::events::Events].
pub trait Events {
    /// Returns all events that have been published by contracts.
    ///
    /// Returns a [`Vec`] of three element tuples containing:
    /// - Contract ID
    /// - Event Topics as a [`Vec<Val>`]
    /// - Event Data as a [`Val`]
    fn all(&self) -> Vec<(crate::Address, Vec<Val>, Val)>;
}

/// Test utilities for [`Logs`][crate::logs::Logs].
pub trait Logs {
    /// Returns all diagnostic events that have been logged.
    fn all(&self) -> std::vec::Vec<String>;
    /// Prints all diagnostic events to stdout.
    fn print(&self);
}

/// Test utilities for [`BytesN`][crate::BytesN].
pub trait BytesN<const N: usize> {
    // Generate a BytesN filled with random bytes.
    //
    // The value filled is not cryptographically secure.
    fn random(env: &Env) -> crate::BytesN<N>;
}

/// Generates an array of N random bytes.
///
/// The value returned is not cryptographically secure.
pub(crate) fn random<const N: usize>() -> [u8; N] {
    use rand::RngCore;
    let mut arr = [0u8; N];
    rand::thread_rng().fill_bytes(&mut arr);
    arr
}

pub trait Address {
    /// Generate a new Address.
    ///
    /// Implementation note: this always builds the contract addresses now. This
    /// shouldn't normally matter though, as contracts should be agnostic to
    /// the underlying Address value.
    fn generate(env: &Env) -> crate::Address;
}

pub trait Deployer {
    /// Gets the TTL of the given contract's instance.
    ///
    /// TTL is the number of ledgers left until the instance entry is considered
    /// expired, excluding the current ledger.
    ///
    /// Panics if there is no instance corresponding to the provided address,
    /// or if the instance has expired.
    fn get_contract_instance_ttl(&self, contract: &crate::Address) -> u32;

    /// Gets the TTL of the given contract's Wasm code entry.
    ///
    /// TTL is the number of ledgers left until the contract code entry
    /// is considered expired, excluding the current ledger.
    ///
    /// Panics if there is no contract instance/code corresponding to
    /// the provided address, or if the instance/code has expired.
    fn get_contract_code_ttl(&self, contract: &crate::Address) -> u32;
}

pub use xdr::AccountFlags as IssuerFlags;

#[derive(Clone)]
pub struct StellarAssetIssuer {
    env: Env,
    account_id: xdr::AccountId,
}

impl StellarAssetIssuer {
    pub(crate) fn new(env: Env, account_id: xdr::AccountId) -> Self {
        Self { env, account_id }
    }

    /// Returns the flags for the issuer.
    pub fn flags(&self) -> u32 {
        self.env
            .host()
            .with_mut_storage(|storage| {
                let k = Rc::new(xdr::LedgerKey::Account(xdr::LedgerKeyAccount {
                    account_id: self.account_id.clone(),
                }));

                let entry = storage.get(
                    &k,
                    soroban_env_host::budget::AsBudget::as_budget(self.env.host()),
                )?;

                match entry.data {
                    xdr::LedgerEntryData::Account(ref e) => Ok(e.flags.clone()),
                    _ => panic!("expected account entry but got {:?}", entry.data),
                }
            })
            .unwrap()
    }

    /// Adds the flag specified to the existing issuer flags
    pub fn set_flag(&self, flag: IssuerFlags) {
        self.overwrite_issuer_flags(self.flags() | (flag as u32))
    }

    /// Clears the flag specified from the existing issuer flags
    pub fn clear_flag(&self, flag: IssuerFlags) {
        self.overwrite_issuer_flags(self.flags() & (!(flag as u32)))
    }

    pub fn address(&self) -> crate::Address {
        xdr::ScAddress::Account(self.account_id.clone())
            .try_into_val(&self.env.clone())
            .unwrap()
    }

    /// Sets the issuer flags field.
    /// Each flag is a bit with values corresponding to [xdr::AccountFlags]
    ///
    /// Use this to test interactions between trustlines/balances and the issuer flags.
    fn overwrite_issuer_flags(&self, flags: u32) {
        if u64::from(flags) > xdr::MASK_ACCOUNT_FLAGS_V17 {
            panic!(
                "issuer flags value must be at most {}",
                xdr::MASK_ACCOUNT_FLAGS_V17
            );
        }

        self.env
            .host()
            .with_mut_storage(|storage| {
                let k = Rc::new(xdr::LedgerKey::Account(xdr::LedgerKeyAccount {
                    account_id: self.account_id.clone(),
                }));

                let mut entry = storage
                    .get(
                        &k,
                        soroban_env_host::budget::AsBudget::as_budget(self.env.host()),
                    )?
                    .as_ref()
                    .clone();

                match entry.data {
                    xdr::LedgerEntryData::Account(ref mut e) => e.flags = flags,
                    _ => panic!("expected account entry but got {:?}", entry.data),
                }

                storage.put(
                    &k,
                    &Rc::new(entry),
                    None,
                    soroban_env_host::budget::AsBudget::as_budget(self.env.host()),
                )?;
                Ok(())
            })
            .unwrap();
    }
}

pub struct StellarAssetContract {
    address: crate::Address,
    issuer: StellarAssetIssuer,
}

impl StellarAssetContract {
    pub(crate) fn new(address: crate::Address, issuer: StellarAssetIssuer) -> Self {
        Self { address, issuer }
    }

    pub fn address(&self) -> crate::Address {
        self.address.clone()
    }

    pub fn issuer(&self) -> StellarAssetIssuer {
        self.issuer.clone()
    }
}
